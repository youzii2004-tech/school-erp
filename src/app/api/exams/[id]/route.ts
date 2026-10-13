import { NextRequest, NextResponse } from "next/server";
import { requireRole, getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

// Next.js 16 dynamic route params are async — must be awaited before use.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const examination = await prisma.examination.findUnique({
    where: { id },
    include: {
      session: true,
      examSubjects: { where: { deletedAt: null }, include: { subject: true } },
    },
  });
  if (!examination || examination.deletedAt)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(examination);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (body?.publish !== true)
    return NextResponse.json({ error: "Only { publish: true } is supported" }, { status: 400 });

  const examination = await prisma.examination.findUnique({ where: { id } });
  if (!examination || examination.deletedAt)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Publishing is one-way — there is no un-publish flow in the schema, so
  // re-publishing would silently overwrite the original publish timestamp.
  if (examination.publishedAt)
    return NextResponse.json({ error: "Already published" }, { status: 409 });

  const updated = await prisma.examination.update({
    where: { id },
    data: { publishedAt: new Date() },
  });
  await audit({ id: session!.user.id, name: session!.user.name }, "exam.publish", "Examination", id);
  return NextResponse.json(updated);
}
