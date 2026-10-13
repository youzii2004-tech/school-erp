import { NextRequest, NextResponse } from "next/server";
import { requireRole, getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { teacherUpdateSchema } from "@/lib/validation/teacher";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: { user: true, subjects: { include: { subject: true } } },
  });
  if (!teacher || teacher.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(teacher);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validateOrThrow(teacherUpdateSchema, await req.json());
    const updated = await prisma.teacher.update({ where: { id }, data: body });
    await audit({ id: session!.user.id, name: session!.user.name }, "teacher.update", "Teacher", id, { fields: Object.keys(body) });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: "Could not update teacher" }, { status: 500 });
  }
}

// Soft-delete the Teacher row only — mirrors DELETE /api/students/[id] (Task 6).
// The linked User/login is never touched or disabled here: no "disable login"
// mechanism exists anywhere in this app yet, and inventing one is out of scope
// for this task (ruling carried forward from Task 18 brief review).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.teacher.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ id: session!.user.id, name: session!.user.name }, "teacher.delete", "Teacher", id);
  return NextResponse.json({ ok: true });
}
