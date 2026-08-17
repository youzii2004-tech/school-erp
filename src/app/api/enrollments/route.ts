import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enrollmentCreateSchema } from "@/lib/validation/enrollment";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

// Added for Task 16 (marks entry UI): no GET existed on this route. ExamSubject
// only carries a classId (not a sectionId), so the marks-entry roster needs every
// active student across all sections of a class — the sectionId-scoped roster
// query in GET /api/attendance (src/app/api/attendance/route.ts) doesn't fit here.
// Same shape/ordering convention as that route: rollNumber-sorted, plain
// {studentId, rollNumber, fullName} rows.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN", "TEACHER"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const classId = req.nextUrl.searchParams.get("classId");
  // Added for Task 21 (promotion workflow): the from-section roster needs to be
  // scoped to one section, not every section of a class. sectionId narrows the
  // classId-scoped query above rather than replacing it, so existing callers
  // (Task 16 marks entry, classId only) are unaffected.
  const sectionId = req.nextUrl.searchParams.get("sectionId");
  if (!classId && !sectionId)
    return NextResponse.json({ error: "classId or sectionId is required" }, { status: 400 });

  const enrollments = await prisma.enrollment.findMany({
    where: {
      ...(classId ? { classId } : {}),
      ...(sectionId ? { sectionId } : {}),
      status: "ACTIVE",
    },
    include: { student: true },
    orderBy: { rollNumber: "asc" },
  });
  return NextResponse.json(
    enrollments.map((e) => ({
      studentId: e.studentId,
      rollNumber: e.rollNumber,
      fullName: e.student.fullName,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validateOrThrow(enrollmentCreateSchema, await req.json());
    const enrollment = await prisma.enrollment.create({ data: body });
    return NextResponse.json(enrollment, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    if ((e as { code?: string }).code === "P2002")
      return NextResponse.json(
        { error: "Student already has an active enrollment this session, or roll number is taken in this section" },
        { status: 409 }
      );
    return NextResponse.json({ error: "Could not create enrollment" }, { status: 500 });
  }
}
