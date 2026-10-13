import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { isRateLimited, resetRateLimit } from "@/lib/rate-limit";

if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32 || secret === "your-secret-key-here") {
    throw new Error("NEXTAUTH_SECRET must be set to a strong random value (>= 32 chars) in production.");
  }
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.username || !credentials?.password) return null;
        const rlKey = `login:${credentials.username.toLowerCase()}`;
        const fwd = req?.headers?.["x-forwarded-for"];
        const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(",")[0]?.trim();
        // Per-username limit stops targeted guessing; per-IP (looser) stops spraying many usernames.
        if (isRateLimited(rlKey) || (ip && isRateLimited(`login-ip:${ip}`, 30))) return null;
        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });
        if (!user || !user.isActive) {
          await audit(undefined, "login.failed", "User", undefined, { username: credentials.username.slice(0, 64), reason: user ? "inactive" : "unknown_user", ip });
          return null;
        }
        const valid = await verifyPassword(credentials.password, user.passwordHash);
        if (!valid) {
          await audit({ id: user.id, name: user.username }, "login.failed", "User", user.id, { reason: "bad_password", ip });
          return null;
        }
        resetRateLimit(rlKey);
        return { id: user.id, name: user.username, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Re-check the account on every token refresh so deactivating a user
      // (or deleting them) revokes access immediately, not at JWT expiry.
      if (!user && token.id) {
        const current = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { isActive: true, role: true },
        });
        if (!current || !current.isActive) return {} as typeof token;
        token.role = current.role;
      }
      if (user) {
        token.role = (user as { role?: string }).role;
        // authorize() returns { id, ... } as `user.id`; NextAuth also mirrors
        // this onto token.sub, but persisting it explicitly on the token
        // avoids depending on that implicit behavior across NextAuth versions.
        token.id = (user as { id?: string }).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: unknown }).role = token.role;
        // Every route that resolves "my own record" (Student/Teacher
        // findUnique by userId) or stamps "who did this" (markedById,
        // enteredById, recordedById, createdById) reads session.user.id.
        // Without this line it stayed undefined at runtime despite being
        // typed as a required string in src/types/next-auth.d.ts, so those
        // Prisma calls threw PrismaClientValidationError and surfaced as a
        // bare 500 — found via Task 27's HTTP smoke test.
        (session.user as { id?: unknown }).id = token.id ?? token.sub;
      }
      return session;
    },
  },
};

type Role = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

export function requireRole(
  session: { user?: { role?: string } } | null,
  roles: Role[]
): boolean {
  return !!session?.user?.role && roles.includes(session.user.role as Role);
}
