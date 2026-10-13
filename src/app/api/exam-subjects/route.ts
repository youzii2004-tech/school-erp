import { NextRequest, NextResponse } from "next/server";
import { requireRole, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { examSubjectCreateSchema } from "@/lib/validation/exam";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

// Added for Task 16 (marks entry UI): Task 14 only shipped POST for this route.
// Any authenticated role may read — TEACHER needs it to populate the marks-entry
// exam-subject picker (further scoped client-side via /api/teacher-subjects),
// ADMIN/others may browse freely. Includes `examination` alongside `subject` so
// callers can read `examSubject.examination.publishedAt` for the locked banner
// without a second request.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const examinationId = req.nextUrl.searchParams.get("examinationId");
  if (!examinationId) return NextResponse.json({ error: "examinationId is required" }, { status: 400 });

  const examSubjects = await prisma.examSubject.findMany({
    where: { examinationId, deletedAt: null },
    include: { subject: true, examination: true },
  });
  return NextResponse.json(examSubjects);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validateOrThrow(examSubjectCreateSchema, await req.json());
    const created = await prisma.examSubject.create({ data: body });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002")
      return NextResponse.json(
        { error: "This subject is already configured for this exam and class" },
        { status: 409 }
      );
    return NextResponse.json({ error: "Could not add exam subject" }, { status: 500 });
  }
}
