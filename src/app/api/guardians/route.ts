import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { guardianCreateSchema } from "@/lib/validation/enrollment";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

// Guardian has no deletedAt field in prisma/schema.prisma — no soft-delete filter here.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN", "TEACHER"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const guardians = await prisma.guardian.findMany({ orderBy: { fullName: "asc" } });
  return NextResponse.json(guardians);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validateOrThrow(guardianCreateSchema, await req.json());
    const guardian = await prisma.guardian.create({ data: body });
    return NextResponse.json(guardian, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: "Could not create guardian" }, { status: 500 });
  }
}
