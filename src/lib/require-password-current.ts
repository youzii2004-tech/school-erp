import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Called from the role layouts: a user flagged mustChangePassword (e.g. after an
 * admin reset) is sent to /account until they pick their own password.
 * Layout-level only: API routes are not blocked, so this is a UX/safety nudge,
 * not a hard access control.
 */
export async function redirectIfPasswordChangeRequired() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mustChangePassword: true },
  });
  if (user?.mustChangePassword) redirect("/account?force=1");
}
