import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { teacherAssignSchema } from "@/lib/validation/teacher";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

// Added for Task 16 (marks entry UI): no route existed for a teacher to read their
// own TeacherSubject assignments. Resolved server-side from session.user.id — never
// from a client-supplied teacherId — same ownership pattern used everywhere else in
// this app (e.g. GET /api/exams' TEACHER branch, GET /api/results' STUDENT branch).
// The marks entry screen uses this to filter GET /api/exam-subjects?examinationId=
// (which returns ALL exam-subjects for an exam) down to the (subjectId, classId)
// pairs this teacher is actually assigned to.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["TEACHER"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const teacher = await prisma.teacher.findUnique({ where: { userId: session!.user.id } });
  if (!teacher) return NextResponse.json([]);

  const subjects = await prisma.teacherSubject.findMany({ where: { teacherId: teacher.id } });
  return NextResponse.json(subjects);
}

// Task 18: admin assigns a teacher to a (subject, class, section) combination.
// Unique per (teacherId, subjectId, classId, sectionId) — enforced by the
// TeacherSubject @@unique constraint in prisma/schema.prisma; a duplicate
// assignment throws Prisma P2002, same pattern as POST /api/teachers' P2002
// handling for duplicate email/username.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validateOrThrow(teacherAssignSchema, await req.json());
    const assignment = await prisma.teacherSubject.create({ data: body });
    return NextResponse.json(assignment, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    if ((e as { code?: string }).code === "P2002")
      return NextResponse.json({ error: "This teacher is already assigned to this subject/class/section" }, { status: 409 });
    return NextResponse.json({ error: "Could not create assignment" }, { status: 500 });
  }
}
