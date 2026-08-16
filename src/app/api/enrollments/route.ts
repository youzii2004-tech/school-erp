import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enrollmentCreateSchema } from "@/lib/validation/enrollment";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validateOrThrow(enrollmentCreateSchema, await req.json());
    const enrollment = await prisma.enrollment.create({ data: body });
    return NextResponse.json(enrollment, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    if ((e as any).code === "P2002")
      return NextResponse.json(
        { error: "Student already has an active enrollment this session, or roll number is taken in this section" },
        { status: 409 }
      );
    return NextResponse.json({ error: "Could not create enrollment" }, { status: 500 });
  }
}
