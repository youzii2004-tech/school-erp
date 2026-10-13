import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { isRateLimited, resetRateLimit } from "@/lib/rate-limit";
import { passwordChangeSchema } from "@/lib/validation/password";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

// Any signed-in user may change their OWN password only; the target is always
// session.user.id, never a client-supplied id.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rlKey = `pwchange:${session.user.id}`;
  if (isRateLimited(rlKey, 5))
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

  try {
    const body = validateOrThrow(passwordChangeSchema, await req.json());
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user || !(await verifyPassword(body.currentPassword, user.passwordHash)))
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(body.newPassword), mustChangePassword: false },
    });
    resetRateLimit(rlKey);
    await audit({ id: user.id, name: user.username }, "password.change", "User", user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: "Could not change password" }, { status: 500 });
  }
}
