import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { examCreateSchema } from "@/lib/validation/exam";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

// GET is scoped per role rather than a plain findMany — STUDENT/PARENT are never
// trusted to supply their own classId, it's always resolved server-side from
// session.user.id (same ownership-check pattern as Task 6/9/12: see
// src/app/api/students/[id]/route.ts GET for the STUDENT/PARENT precedent).
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;

  if (role === "ADMIN") {
    // Optional classId filter — same examSubjects-some pattern as the
    // TEACHER/STUDENT/PARENT branches below, so callers (e.g. the marksheet
    // page) can find "exams for this class" without an N+1 fetch. Admin still
    // sees drafts (publishedAt not filtered) — admin is authorized to see
    // unpublished exams; callers that need published-only filter client-side.
    const classId = req.nextUrl.searchParams.get("classId");
    const exams = await prisma.examination.findMany({
      where: {
        deletedAt: null,
        ...(classId ? { examSubjects: { some: { classId } } } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(exams);
  }

  if (role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: { subjects: true },
    });
    if (!teacher) return NextResponse.json([]);
    const classIds = [...new Set(teacher.subjects.map((ts) => ts.classId))];
    if (classIds.length === 0) return NextResponse.json([]);

    const exams = await prisma.examination.findMany({
      where: {
        deletedAt: null,
        examSubjects: { some: { classId: { in: classIds } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(exams);
  }

  if (role === "STUDENT") {
    const student = await prisma.student.findUnique({ where: { userId: session.user.id } });
    if (!student) return NextResponse.json([]);
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId: student.id, status: "ACTIVE" },
    });
    if (!enrollment) return NextResponse.json([]);

    const exams = await prisma.examination.findMany({
      where: {
        deletedAt: null,
        publishedAt: { not: null },
        examSubjects: { some: { classId: enrollment.classId } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(exams);
  }

  if (role === "PARENT") {
    const links = await prisma.guardianLink.findMany({ where: { userId: session.user.id } });
    const studentIds = [...new Set(links.map((l) => l.studentId))];
    if (studentIds.length === 0) return NextResponse.json([]);

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: { in: studentIds }, status: "ACTIVE" },
    });
    const classIds = [...new Set(enrollments.map((e) => e.classId))];
    if (classIds.length === 0) return NextResponse.json([]);

    const exams = await prisma.examination.findMany({
      where: {
        deletedAt: null,
        publishedAt: { not: null },
        examSubjects: { some: { classId: { in: classIds } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(exams);
  }

  return NextResponse.json([]);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validateOrThrow(examCreateSchema, await req.json());
    const created = await prisma.examination.create({ data: body });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: "Could not create examination" }, { status: 500 });
  }
}
