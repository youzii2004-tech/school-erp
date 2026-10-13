import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { studentUpdateSchema } from "@/lib/validation/student";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      guardianLinks: { include: { guardian: true } },
      enrollments: { include: { class: true, section: true, session: true }, orderBy: { createdAt: "desc" } },
      promotions: true,
      transfers: true,
      documents: true,
    },
  });
  if (!student || student.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "STUDENT" && student.userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (session.user.role === "PARENT") {
    const linked = await prisma.guardianLink.findFirst({
      where: { studentId: student.id, userId: session.user.id },
    });
    if (!linked) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(student);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validateOrThrow(studentUpdateSchema, await req.json());
    const updated = await prisma.student.update({ where: { id }, data: body });
    await audit({ id: session!.user.id, name: session!.user.name }, "student.update", "Student", id, { fields: Object.keys(body) });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: "Could not update student" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.student.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ id: session!.user.id, name: session!.user.name }, "student.delete", "Student", id);
  return NextResponse.json({ ok: true });
}
