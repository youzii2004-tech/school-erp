import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
