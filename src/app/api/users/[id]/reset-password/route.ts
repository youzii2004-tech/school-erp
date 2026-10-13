import { NextRequest, NextResponse } from "next/server";
import { hashPassword, requireRole, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { generateTempPassword } from "@/lib/temp-password";

// Admin sets a one-time temporary password; the user must replace it at next sign-in.
// The temp password is returned once in the response and never logged or stored in plain text.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!requireRole(session, ["ADMIN"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const tempPassword = generateTempPassword();
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(tempPassword), mustChangePassword: true },
  });
  await audit({ id: session!.user.id, name: session!.user.name }, "user.password_reset", "User", id, { username: target.username });
  return NextResponse.json({ username: target.username, tempPassword });
}
