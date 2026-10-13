import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({ isActive: z.boolean() });

// Activate / deactivate an account. Deactivation takes effect on the user's next request.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!requireRole(session, ["ADMIN"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  if (id === session!.user.id && !parsed.data.isActive)
    return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Never leave the school without an active admin.
  if (!parsed.data.isActive && target.role === "ADMIN") {
    const others = await prisma.user.count({ where: { role: "ADMIN", isActive: true, id: { not: id } } });
    if (others === 0) return NextResponse.json({ error: "At least one active admin is required" }, { status: 400 });
  }
  await prisma.user.update({ where: { id }, data: { isActive: parsed.data.isActive } });
  await audit({ id: session!.user.id, name: session!.user.name }, parsed.data.isActive ? "user.activate" : "user.deactivate", "User", id, { username: target.username });
  return NextResponse.json({ ok: true });
}
