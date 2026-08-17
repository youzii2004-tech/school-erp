import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { examSubjectCreateSchema } from "@/lib/validation/exam";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
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
