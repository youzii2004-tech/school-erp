import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateGrade, calculatePositions, DEFAULT_GRADE_BANDS } from "@/lib/grading";
import { getSetting } from "@/lib/settings";

// Design choice: a student with no Mark row for a given ExamSubject has that
// subject EXCLUDED from their total/totalMax (not treated as obtained=0).
// Rationale: this route is also used by ADMIN/TEACHER to preview results
// before an exam is published, while marks entry is still in progress. If a
// not-yet-graded subject were scored as 0/total, every partially-graded
// class would show artificially collapsed percentages and positions until
// the last mark is entered, which is misleading for a working view. Once an
// exam is actually published, all ExamSubjects for that class are expected
// to have complete Mark rows (enforced by the marks-entry workflow), so this
// only affects the in-progress preview case, not the published result.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Task 25: read the admin-configured grade bands (Settings UI) instead of
  // always using DEFAULT_GRADE_BANDS, so that UI is not cosmetic-only.
  const gradeBands = await getSetting("gradeBands", DEFAULT_GRADE_BANDS);

  const examinationId = req.nextUrl.searchParams.get("examinationId");
  const classId = req.nextUrl.searchParams.get("classId");
  if (!examinationId || !classId)
    return NextResponse.json({ error: "examinationId and classId are required" }, { status: 400 });

  const examination = await prisma.examination.findUnique({ where: { id: examinationId } });
  if (!examination) return NextResponse.json({ error: "Examination not found" }, { status: 404 });

  const role = session.user.role;
  const isPublished = !!examination.publishedAt;

  if (!isPublished && (role === "STUDENT" || role === "PARENT"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Resolve which studentIds this caller is allowed to see. ADMIN/TEACHER see
  // the whole class; STUDENT/PARENT are scoped server-side from session.user.id,
  // never from a client-supplied studentId (same pattern as GET /api/exams).
  let allowedStudentIds: Set<string> | null = null; // null = no restriction

  if (role === "STUDENT") {
    const student = await prisma.student.findUnique({ where: { userId: session.user.id } });
    if (!student) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    allowedStudentIds = new Set([student.id]);
  } else if (role === "PARENT") {
    const links = await prisma.guardianLink.findMany({ where: { userId: session.user.id } });
    const studentIds = [...new Set(links.map((l) => l.studentId))];
    if (studentIds.length === 0) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    allowedStudentIds = new Set(studentIds);
  } else if (role !== "ADMIN" && role !== "TEACHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const examSubjects = await prisma.examSubject.findMany({
    where: { examinationId, classId, deletedAt: null },
    include: { subject: true },
  });
  const examSubjectIds = examSubjects.map((es) => es.id);
  const examSubjectById = new Map(examSubjects.map((es) => [es.id, es]));

  const marks = examSubjectIds.length
    ? await prisma.mark.findMany({ where: { examSubjectId: { in: examSubjectIds } } })
    : [];
  const marksByStudent = new Map<string, typeof marks>();
  for (const m of marks) {
    const list = marksByStudent.get(m.studentId) ?? [];
    list.push(m);
    marksByStudent.set(m.studentId, list);
  }

  const roster = await prisma.enrollment.findMany({
    where: { classId, status: "ACTIVE" },
    include: { student: true },
  });

  // Positions are computed across the FULL class roster first, so a STUDENT
  // or PARENT viewer still sees their true class-wide rank (not a rank among
  // only the row(s) they're allowed to see). The visibility filter is applied
  // afterward, only to which rows are returned in the response.
  const allRows = roster.map((e) => {
    const studentMarks = marksByStudent.get(e.studentId) ?? [];
    const subjects = studentMarks.map((m) => {
      const es = examSubjectById.get(m.examSubjectId)!;
      return { subjectName: es.subject.name, obtained: m.obtainedMarks, total: es.totalMarks };
    });
    const total = subjects.reduce((sum, s) => sum + s.obtained, 0);
    const totalMax = subjects.reduce((sum, s) => sum + s.total, 0);
    const percentage = totalMax > 0 ? (total / totalMax) * 100 : 0;
    const grade = calculateGrade(percentage, gradeBands);
    return {
      studentId: e.studentId,
      fullName: e.student.fullName,
      total,
      totalMax,
      percentage,
      grade,
      subjects,
    };
  });

  const positions = calculatePositions(allRows.map((r) => ({ studentId: r.studentId, total: r.total })));

  const result = allRows
    .filter((r) => !allowedStudentIds || allowedStudentIds.has(r.studentId))
    .map((r) => ({ ...r, position: positions.get(r.studentId) ?? null }));

  return NextResponse.json(result);
}
