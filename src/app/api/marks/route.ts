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
  const marks = await prisma.mark.findMany({ where: { examSubjectId }, include: { student: true } });
  return NextResponse.json(marks);
}
