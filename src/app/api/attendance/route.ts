import { NextRequest, NextResponse } from "next/server";
import { requireRole, getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { attendanceBulkSchema } from "@/lib/validation/attendance";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ["ADMIN", "TEACHER"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validateOrThrow(attendanceBulkSchema, await req.json());

    // A TEACHER may only mark attendance for a section they're actually
    // assigned to, mirroring the TeacherSubject-assignment check POST
    // /api/marks already does in this same file. TeacherSubject carries
    // sectionId directly (see prisma/schema.prisma), so no class/section
    // lookup is needed beyond this one query.
    if (session!.user.role === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({ where: { userId: session!.user.id } });
      const assigned = teacher
        ? await prisma.teacherSubject.findFirst({ where: { teacherId: teacher.id, sectionId: body.sectionId } })
        : null;
      if (!assigned)
        return NextResponse.json({ error: "You are not assigned to this section" }, { status: 403 });
    }

    // Every entry must belong to the section being marked; otherwise an
    // assigned teacher could write attendance for any student in the school.
    const ids = [...new Set(body.entries.map((e) => e.studentId))];
    const rostered = await prisma.enrollment.findMany({
      where: { sectionId: body.sectionId, status: "ACTIVE", studentId: { in: ids } },
      distinct: ["studentId"],
      select: { studentId: true },
    });
    if (rostered.length !== ids.length)
      return NextResponse.json({ error: "One or more students are not enrolled in this section" }, { status: 400 });

    const result = await prisma.$transaction(
      body.entries.map((entry) =>
        prisma.attendance.upsert({
          where: { studentId_date: { studentId: entry.studentId, date: body.date } },
          create: { studentId: entry.studentId, date: body.date, status: entry.status, remarks: entry.remarks, markedById: session!.user.id },
          update: { status: entry.status, remarks: entry.remarks, markedById: session!.user.id },
        })
      )
    );
    await audit({ id: session!.user.id, name: session!.user.name }, "attendance.save", "Attendance", body.sectionId, { count: result.length, date: body.date });
    return NextResponse.json({ count: result.length }, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: "Could not save attendance" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sectionId = req.nextUrl.searchParams.get("sectionId");
  const date = req.nextUrl.searchParams.get("date");
  if (!sectionId || !date) return NextResponse.json({ error: "sectionId and date are required" }, { status: 400 });

  // Same role-scoping shape as GET /api/results and GET /api/marks: ADMIN
  // sees the whole section roster; TEACHER only if assigned to this section
  // (same TeacherSubject check as POST above); STUDENT/PARENT never see
  // another student's roster row — they're narrowed to their own/linked
  // studentId(s), which the AttendanceGrid UI (the only current caller of
  // this route, teacher/attendance) never exercises since it's TEACHER-only,
  // but a direct STUDENT/PARENT call now returns only their own row instead
  // of the full class roster.
  const role = session.user.role;
  let allowedStudentIds: Set<string> | null = null; // null = no restriction

  if (role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
    const assigned = teacher
      ? await prisma.teacherSubject.findFirst({ where: { teacherId: teacher.id, sectionId } })
      : null;
    if (!assigned)
      return NextResponse.json({ error: "You are not assigned to this section" }, { status: 403 });
  } else if (role === "STUDENT") {
    const student = await prisma.student.findUnique({ where: { userId: session.user.id } });
    if (!student) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    allowedStudentIds = new Set([student.id]);
  } else if (role === "PARENT") {
    const links = await prisma.guardianLink.findMany({ where: { userId: session.user.id } });
    const studentIds = [...new Set(links.map((l) => l.studentId))];
    if (studentIds.length === 0) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    allowedStudentIds = new Set(studentIds);
  } else if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      sectionId,
      status: "ACTIVE",
      ...(allowedStudentIds ? { studentId: { in: [...allowedStudentIds] } } : {}),
    },
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
