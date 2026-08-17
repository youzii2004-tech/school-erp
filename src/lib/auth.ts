import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });
        if (!user || !user.isActive) return null;
        const valid = await verifyPassword(credentials.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, name: user.username, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
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
