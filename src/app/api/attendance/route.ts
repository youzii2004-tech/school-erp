import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { attendanceBulkSchema } from "@/lib/validation/attendance";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN", "TEACHER"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validateOrThrow(attendanceBulkSchema, await req.json());
    const result = await prisma.$transaction(
      body.entries.map((entry) =>
        prisma.attendance.upsert({
          where: { studentId_date: { studentId: entry.studentId, date: body.date } },
          create: { studentId: entry.studentId, date: body.date, status: entry.status, remarks: entry.remarks, markedById: session!.user.id },
          update: { status: entry.status, remarks: entry.remarks, markedById: session!.user.id },
        })
      )
    );
    return NextResponse.json({ count: result.length }, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: "Could not save attendance" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sectionId = req.nextUrl.searchParams.get("sectionId");
  const date = req.nextUrl.searchParams.get("date");
  if (!sectionId || !date) return NextResponse.json({ error: "sectionId and date are required" }, { status: 400 });

  const enrollments = await prisma.enrollment.findMany({
    where: { sectionId, status: "ACTIVE" },
    include: { student: true },
    orderBy: { rollNumber: "asc" },
  });
  const records = await prisma.attendance.findMany({
    where: { date: new Date(date), studentId: { in: enrollments.map((e) => e.studentId) } },
  });
  const byStudent = Object.fromEntries(records.map((r) => [r.studentId, r]));
  return NextResponse.json(
    enrollments.map((e) => ({
      studentId: e.studentId,
      rollNumber: e.rollNumber,
      fullName: e.student.fullName,
      status: byStudent[e.studentId]?.status ?? null,
    }))
  );
}
