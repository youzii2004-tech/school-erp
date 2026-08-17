import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { guardianLinkSchema } from "@/lib/validation/enrollment";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

// Next.js 16: dynamic route params are async — must be awaited before use.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validateOrThrow(guardianLinkSchema, await req.json());
    const link = await prisma.guardianLink.create({
      data: { studentId: id, guardianId: body.guardianId },
      include: { guardian: true },
    });
    return NextResponse.json(link, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    if ((e as { code?: string }).code === "P2002")
      return NextResponse.json({ error: "This guardian is already linked to this student" }, { status: 409 });
    return NextResponse.json({ error: "Could not link guardian" }, { status: 500 });
  }
}
