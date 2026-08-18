import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

const marksBulkSchema = z.object({
  examSubjectId: z.string().min(1),
  entries: z.array(z.object({ studentId: z.string().min(1), obtainedMarks: z.coerce.number().min(0) })).min(1),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN", "TEACHER"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validateOrThrow(marksBulkSchema, await req.json());
    const examSubject = await prisma.examSubject.findUnique({
      where: { id: body.examSubjectId },
      include: { examination: true },
    });
    if (!examSubject) return NextResponse.json({ error: "Exam subject not found" }, { status: 404 });
    if (session!.user.role === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({ where: { userId: session!.user.id } });
      const assigned = teacher
        ? await prisma.teacherSubject.findFirst({
            where: { teacherId: teacher.id, subjectId: examSubject.subjectId, classId: examSubject.classId },
          })
        : null;
      if (!assigned)
        return NextResponse.json({ error: "You are not assigned to this class/subject" }, { status: 403 });
    }
    if (examSubject.examination.publishedAt)
      return NextResponse.json({ error: "Results are published and locked for this exam" }, { status: 409 });
    if (body.entries.some((e) => e.obtainedMarks > examSubject.totalMarks))
      return NextResponse.json({ error: "Obtained marks cannot exceed total marks" }, { status: 400 });

    await prisma.$transaction(
      body.entries.map((entry) =>
        prisma.mark.upsert({
          where: { examSubjectId_studentId: { examSubjectId: body.examSubjectId, studentId: entry.studentId } },
          create: {
            examSubjectId: body.examSubjectId,
            examinationId: examSubject.examinationId,
            studentId: entry.studentId,
            obtainedMarks: entry.obtainedMarks,
            enteredById: session!.user.id,
          },
          update: { obtainedMarks: entry.obtainedMarks, enteredById: session!.user.id },
        })
      )
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: "Could not save marks" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const examSubjectId = req.nextUrl.searchParams.get("examSubjectId");
  if (!examSubjectId) return NextResponse.json({ error: "examSubjectId is required" }, { status: 400 });

  const examSubject = await prisma.examSubject.findUnique({
    where: { id: examSubjectId },
    include: { examination: true },
  });
  if (!examSubject) return NextResponse.json({ error: "Exam subject not found" }, { status: 404 });

  const role = session.user.role;
  const isPublished = !!examSubject.examination.publishedAt;

  // Resolve which studentIds this caller is allowed to see, same pattern as
  // GET /api/results: ADMIN/TEACHER see the whole exam-subject roster (subject
  // to the TeacherSubject assignment check below); STUDENT/PARENT are scoped
  // server-side from session.user.id and blocked entirely for an unpublished
  // exam, matching results/route.ts's exact behavior.
  let allowedStudentIds: Set<string> | null = null; // null = no restriction

  if (role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
    const assigned = teacher
      ? await prisma.teacherSubject.findFirst({
          where: { teacherId: teacher.id, subjectId: examSubject.subjectId, classId: examSubject.classId },
        })
      : null;
    if (!assigned)
      return NextResponse.json({ error: "You are not assigned to this class/subject" }, { status: 403 });
  } else if (role === "STUDENT") {
    if (!isPublished) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const student = await prisma.student.findUnique({ where: { userId: session.user.id } });
    if (!student) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    allowedStudentIds = new Set([student.id]);
  } else if (role === "PARENT") {
    if (!isPublished) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const links = await prisma.guardianLink.findMany({ where: { userId: session.user.id } });
    const studentIds = [...new Set(links.map((l) => l.studentId))];
    if (studentIds.length === 0) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    allowedStudentIds = new Set(studentIds);
  } else if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const marks = await prisma.mark.findMany({
    where: {
      examSubjectId,
      ...(allowedStudentIds ? { studentId: { in: [...allowedStudentIds] } } : {}),
    },
    include: { student: true },
  });
  return NextResponse.json(marks);
}
