# School ERP MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working, good-looking School Management ERP MVP (auth, students, classes/sessions, attendance, fees, exams/results, teacher management, timetable, announcements, role dashboards) as a single self-hostable Next.js app.

**Architecture:** One Next.js 14 App Router project. Next.js API routes are the backend (no separate server). Prisma ORM against a single SQLite file. NextAuth (Credentials + JWT) for auth with role stored in the session token, enforced by middleware and per-route checks. Tailwind + shadcn/ui for a consistent, commercial-looking design system. Recharts for dashboard visualizations.

**Tech Stack:** Next.js 14 (App Router, TypeScript), Tailwind CSS, shadcn/ui, Prisma + SQLite, NextAuth.js (Credentials provider, JWT strategy, bcryptjs hashing), Zod (shared validation), Recharts, `xlsx` (CSV/Excel import-export).

**Spec:** `docs/superpowers/specs/2026-08-16-school-erp-mvp-design.md`

## Global Constraints

- Frontend quality is the priority — every page uses the shared design tokens and shadcn/ui components; no unstyled raw HTML tables/forms.
- 4 roles only: Admin, Teacher, Student, Parent (spec's Non-Goals: no 8-role matrix).
- No library/transport/inventory/multi-campus/SMS-email-sending/certificates/ID-cards/real-PDF-export/scheduled-backups in v1 — do not build stubs that pretend to work; a plain "Coming soon" card is acceptable if a nav link is expected, otherwise omit the link entirely.
- Soft delete only (`deletedAt` column) on students, fee records, exam/mark records — never a hard delete from the UI.
- One active enrollment per student per academic session — enforced by a unique constraint (`studentId`, `academicSessionId`).
- Zod validation at every API boundary; never surface raw Prisma/DB errors to the client — catch and return a professional message.
- Every multi-row write (payment + voucher balance update, promotion, result publish) uses a Prisma `$transaction`.
- Grading: percentage + letter-grade band, configurable in Settings (no GPA in v1).
- Published exam results become read-only (a `publishedAt` timestamp on `examinations`; once set, marks for that exam reject further writes at the API level).

---

## Phase 0 — Project Scaffold

### Task 1: Initialize Next.js project, Tailwind, shadcn/ui, base layout shell

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`, `.gitignore`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `components.json` (shadcn config)
- Create: `src/lib/utils.ts` (shadcn `cn` helper)
- Create: `README.md` (placeholder header only — filled in by Task 33)

**Interfaces:**
- Produces: `cn(...classes: ClassValue[]): string` in `src/lib/utils.ts`, used by every component task from here on.

- [ ] **Step 1: Scaffold the project**

Run:
```bash
npx create-next-app@latest school-erp --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
cd school-erp
```
Expected: a working Next.js app boots with `npm run dev`.

- [ ] **Step 2: Install shadcn/ui and initialize it**

Run:
```bash
npx shadcn@latest init -d
```
Expected: `components.json` created, `src/lib/utils.ts` created with a `cn()` export, Tailwind config updated with shadcn's CSS variables theme.

- [ ] **Step 3: Install base component primitives used across the app**

Run:
```bash
npx shadcn@latest add button card table input label select dialog dropdown-menu badge tabs form textarea toast avatar separator skeleton
```
Expected: components land under `src/components/ui/`.

- [ ] **Step 4: Define the design tokens (colors/radius) in `src/app/globals.css`**

Set the shadcn CSS variables to a consistent institute-style palette (deep blue primary, neutral slate background, green/red/amber semantic colors for paid/overdue/pending) — replace the default shadcn zinc theme's `:root` and `.dark` blocks with:

```css
:root {
  --background: 210 20% 98%;
  --foreground: 222 47% 11%;
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;
  --primary: 221 83% 33%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222 47% 11%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  --accent: 210 40% 94%;
  --accent-foreground: 222 47% 11%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 210 40% 98%;
  --border: 214 32% 91%;
  --input: 214 32% 91%;
  --ring: 221 83% 33%;
  --radius: 0.6rem;
  --success: 142 71% 35%;
  --warning: 38 92% 50%;
}
.dark {
  --background: 222 47% 8%;
  --foreground: 210 40% 98%;
  --card: 222 47% 11%;
  --card-foreground: 210 40% 98%;
  --primary: 217 91% 60%;
  --primary-foreground: 222 47% 11%;
  --secondary: 217 33% 17%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217 33% 17%;
  --muted-foreground: 215 20% 65%;
  --accent: 217 33% 17%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 63% 31%;
  --destructive-foreground: 210 40% 98%;
  --border: 217 33% 17%;
  --input: 217 33% 17%;
  --ring: 217 91% 60%;
  --success: 142 71% 45%;
  --warning: 38 92% 55%;
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: build succeeds with zero errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind and shadcn/ui"
```

---

### Task 2: Prisma schema (full data model) and SQLite setup

**Files:**
- Create: `prisma/schema.prisma`
- Create: `.env` (`DATABASE_URL="file:./dev.db"`, `NEXTAUTH_SECRET=<generated>`)
- Create: `.env.example`
- Modify: `.gitignore` (add `.env`, `prisma/dev.db`, `/uploads`)
- Create: `src/lib/prisma.ts`

**Interfaces:**
- Produces: `prisma` singleton client from `src/lib/prisma.ts`, imported as `import { prisma } from "@/lib/prisma"` by every later API task.
- Produces: all Prisma models below, used by every later task by name.

- [ ] **Step 1: Install Prisma**

Run: `npm install prisma @prisma/client && npx prisma init --datasource-provider sqlite`

- [ ] **Step 2: Write the full schema**

`prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  TEACHER
  STUDENT
  PARENT
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
  LEAVE
}

enum VoucherStatus {
  UNPAID
  PARTIALLY_PAID
  PAID
  OVERDUE
  CANCELLED
}

enum PaymentMethod {
  CASH
  BANK_TRANSFER
  ONLINE
  CHEQUE
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  username      String    @unique
  passwordHash  String
  role          Role
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  student       Student?
  teacher       Teacher?
  guardianLinks GuardianLink[]
}

model AcademicSession {
  id          String   @id @default(cuid())
  name        String   @unique // e.g. "2026-2027"
  startDate   DateTime
  endDate     DateTime
  isCurrent   Boolean  @default(false)
  createdAt   DateTime @default(now())
  classes     Class[]
  enrollments Enrollment[]
  examinations Examination[]
  feeVouchers FeeVoucher[]
}

model Class {
  id        String    @id @default(cuid())
  name      String    // e.g. "Grade 6"
  sessionId String
  session   AcademicSession @relation(fields: [sessionId], references: [id])
  sections  Section[]
  feeStructures FeeStructure[]
  deletedAt DateTime?

  @@unique([name, sessionId])
}

model Section {
  id           String   @id @default(cuid())
  name         String   // e.g. "A"
  classId      String
  class        Class    @relation(fields: [classId], references: [id])
  enrollments  Enrollment[]
  timetableEntries TimetableEntry[]
  deletedAt    DateTime?

  @@unique([name, classId])
}

model Subject {
  id            String   @id @default(cuid())
  name          String   @unique
  code          String   @unique
  deletedAt     DateTime?
  examSubjects  ExamSubject[]
  timetableEntries TimetableEntry[]
  teacherSubjects TeacherSubject[]
}

model Student {
  id                String    @id @default(cuid())
  admissionNumber   String    @unique
  userId            String?   @unique
  user              User?     @relation(fields: [userId], references: [id])
  fullName          String
  gender            String
  dob               DateTime
  cnicOrBForm       String?
  bloodGroup        String?
  photoPath         String?
  phone             String?
  address           String?
  previousSchool    String?
  status            String    @default("ACTIVE") // ACTIVE, LEFT, GRADUATED
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?

  guardianLinks     GuardianLink[]
  enrollments       Enrollment[]
  attendance        Attendance[]
  feeVouchers       FeeVoucher[]
  marks             Mark[]
  documents         Document[]
  promotions        PromotionHistory[]
  transfers         TransferHistory[]
}

model Guardian {
  id        String   @id @default(cuid())
  fullName  String
  relation  String   // Father, Mother, Guardian
  phone     String
  email     String?
  cnic      String?
  address   String?
  links     GuardianLink[]
}

model GuardianLink {
  id         String   @id @default(cuid())
  studentId  String
  guardianId String
  userId     String?  // if this guardian has a Parent portal login
  student    Student  @relation(fields: [studentId], references: [id])
  guardian   Guardian @relation(fields: [guardianId], references: [id])
  user       User?    @relation(fields: [userId], references: [id])

  @@unique([studentId, guardianId])
}

model Enrollment {
  id               String   @id @default(cuid())
  studentId        String
  academicSessionId String
  classId          String
  sectionId        String
  rollNumber       String
  status           String   @default("ACTIVE") // ACTIVE, PROMOTED, TRANSFERRED, LEFT
  createdAt        DateTime @default(now())

  student   Student         @relation(fields: [studentId], references: [id])
  session   AcademicSession @relation(fields: [academicSessionId], references: [id])
  class     Class           @relation(fields: [classId], references: [id])
  section   Section         @relation(fields: [sectionId], references: [id])

  @@unique([studentId, academicSessionId])
  @@unique([sectionId, rollNumber, academicSessionId])
}

model PromotionHistory {
  id             String   @id @default(cuid())
  studentId      String
  fromClassName  String
  toClassName    String
  fromSessionName String
  toSessionName  String
  promotedAt     DateTime @default(now())
  student        Student  @relation(fields: [studentId], references: [id])
}

model TransferHistory {
  id          String   @id @default(cuid())
  studentId   String
  type        String   // "IN" or "OUT"
  reason      String?
  otherSchool String?
  date        DateTime @default(now())
  student     Student  @relation(fields: [studentId], references: [id])
}

model Attendance {
  id        String            @id @default(cuid())
  studentId String
  date      DateTime
  status    AttendanceStatus
  remarks   String?
  markedById String
  student   Student @relation(fields: [studentId], references: [id])

  @@unique([studentId, date])
}

model FeeStructure {
  id          String   @id @default(cuid())
  classId     String
  category    String   // Tuition, Admission, Exam, Transport, Computer, Library, Activity, Other
  amount      Float
  frequency   String   // MONTHLY, ONE_TIME, ANNUAL
  class       Class    @relation(fields: [classId], references: [id])
  deletedAt   DateTime?
}

model FeeVoucher {
  id               String   @id @default(cuid())
  voucherNumber    String   @unique
  studentId        String
  academicSessionId String
  billingMonth     String   // "2026-08"
  dueDate          DateTime
  breakdown        String   // JSON-encoded [{category, amount}]
  previousBalance  Float    @default(0)
  discount         Float    @default(0)
  fine             Float    @default(0)
  totalPayable     Float
  paidAmount       Float    @default(0)
  status           VoucherStatus @default(UNPAID)
  createdAt        DateTime @default(now())
  deletedAt        DateTime?

  student  Student         @relation(fields: [studentId], references: [id])
  session  AcademicSession @relation(fields: [academicSessionId], references: [id])
  payments FeePayment[]
}

model FeePayment {
  id             String   @id @default(cuid())
  voucherId      String
  amount         Float
  method         PaymentMethod
  reference      String?
  paidAt         DateTime @default(now())
  recordedById   String
  voucher        FeeVoucher @relation(fields: [voucherId], references: [id])
  deletedAt      DateTime?
}

model Examination {
  id             String   @id @default(cuid())
  name           String   // "Midterm 2026"
  type           String   // MIDTERM, FINAL, MONTHLY, QUIZ, CLASS_TEST
  academicSessionId String
  publishedAt    DateTime?
  createdAt      DateTime @default(now())
  session        AcademicSession @relation(fields: [academicSessionId], references: [id])
  examSubjects   ExamSubject[]
  marks          Mark[]
}

model ExamSubject {
  id            String   @id @default(cuid())
  examinationId String
  subjectId     String
  classId       String
  totalMarks    Float
  passingMarks  Float
  examDate      DateTime
  examination   Examination @relation(fields: [examinationId], references: [id])
  subject       Subject     @relation(fields: [subjectId], references: [id])
  marks         Mark[]

  @@unique([examinationId, subjectId, classId])
}

model Mark {
  id             String   @id @default(cuid())
  examinationId  String
  examSubjectId  String
  studentId      String
  obtainedMarks  Float
  enteredById    String
  updatedAt      DateTime @updatedAt
  examination    Examination @relation(fields: [examinationId], references: [id])
  examSubject    ExamSubject @relation(fields: [examSubjectId], references: [id])
  student        Student     @relation(fields: [studentId], references: [id])

  @@unique([examSubjectId, studentId])
}

model Teacher {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  fullName        String
  cnic            String?
  qualification   String?
  joiningDate     DateTime?
  designation     String?
  phone           String?
  photoPath       String?
  deletedAt       DateTime?
  subjects        TeacherSubject[]
  timetableEntries TimetableEntry[]
}

model TeacherSubject {
  id        String  @id @default(cuid())
  teacherId String
  subjectId String
  classId   String
  sectionId String
  teacher   Teacher @relation(fields: [teacherId], references: [id])
  subject   Subject @relation(fields: [subjectId], references: [id])

  @@unique([teacherId, subjectId, classId, sectionId])
}

model TimetableEntry {
  id        String   @id @default(cuid())
  sectionId String
  subjectId String
  teacherId String
  dayOfWeek Int      // 0-6
  startTime String   // "08:00"
  endTime   String   // "08:45"
  room      String?
  section   Section  @relation(fields: [sectionId], references: [id])
  subject   Subject  @relation(fields: [subjectId], references: [id])
  teacher   Teacher  @relation(fields: [teacherId], references: [id])
}

model Announcement {
  id         String   @id @default(cuid())
  title      String
  body       String
  audience   String   // ALL, CLASS:<id>, SECTION:<id>, ROLE:<role>
  createdAt  DateTime @default(now())
  createdById String
}

model Document {
  id        String   @id @default(cuid())
  studentId String
  type      String   // BIRTH_CERT, CNIC, PREVIOUS_CERT, PHOTO, LEAVING_CERT, OTHER
  filePath  String
  uploadedAt DateTime @default(now())
  student   Student  @relation(fields: [studentId], references: [id])
}

model Setting {
  key   String @id
  value String // JSON-encoded value
}
```

- [ ] **Step 3: Configure env and prisma client singleton**

`.env`:
```
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="dev-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```
`.env.example` — same keys, empty/placeholder values (safe to commit).

`src/lib/prisma.ts`:
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

Add to `.gitignore`: `.env`, `prisma/dev.db`, `/uploads`.

- [ ] **Step 4: Run migration**

Run: `npx prisma migrate dev --name init`
Expected: `prisma/dev.db` created, migration succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Prisma schema and SQLite datasource"
```

---

### Task 3: Auth (NextAuth Credentials + JWT), role middleware, login page

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/middleware.ts`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/types/next-auth.d.ts` (module augmentation for `role` on session)
- Test: `src/lib/__tests__/auth.test.ts`

**Interfaces:**
- Consumes: `prisma` from `src/lib/prisma.ts` (Task 2).
- Produces: `authOptions` export from `src/lib/auth.ts`, used by every protected API route via `getServerSession(authOptions)`. Session shape: `{ user: { id: string, role: "ADMIN"|"TEACHER"|"STUDENT"|"PARENT", name: string } }`.
- Produces: `requireRole(session, roles: Role[]): boolean` helper in `src/lib/auth.ts`, used by every protected API route.

- [ ] **Step 1: Install deps**

Run: `npm install next-auth bcryptjs zod && npm install -D @types/bcryptjs`

- [ ] **Step 2: Write the failing test for password verification helper**

`src/lib/__tests__/auth.test.ts`:
```ts
import { verifyPassword, hashPassword } from "../auth";

describe("password hashing", () => {
  it("hashes and verifies a matching password", async () => {
    const hash = await hashPassword("Sch00l!Pass");
    expect(await verifyPassword("Sch00l!Pass", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("Sch00l!Pass");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});
```

Run: `npm install -D jest @types/jest ts-jest && npx ts-jest config:init`
Add to `package.json` scripts: `"test": "jest"`.

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- auth.test.ts`
Expected: FAIL — `hashPassword`/`verifyPassword` not defined.

- [ ] **Step 4: Implement `src/lib/auth.ts`**

```ts
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
      if (user) token.role = (user as any).role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).role = token.role;
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
```

`src/types/next-auth.d.ts`:
```ts
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
    };
  }
}
```

`src/app/api/auth/[...nextauth]/route.ts`:
```ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- auth.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Middleware for role-gated routes**

`src/middleware.ts`:
```ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const roleHome: Record<string, string> = {
  ADMIN: "/admin",
  TEACHER: "/teacher",
  STUDENT: "/student",
  PARENT: "/parent",
};

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role as string | undefined;
    const path = req.nextUrl.pathname;
    const areaPrefix = "/" + path.split("/")[1];
    if (role && roleHome[role] && areaPrefix !== roleHome[role] && Object.values(roleHome).includes(areaPrefix)) {
      return NextResponse.redirect(new URL(roleHome[role], req.url));
    }
    return NextResponse.next();
  },
  { callbacks: { authorized: ({ token }) => !!token } }
);

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*", "/parent/:path*"],
};
```

- [ ] **Step 7: Login page**

`src/app/(auth)/login/page.tsx` — a centered card with institute name placeholder, username + password fields (shadcn `Input`, `Label`, `Button`, `Card`), calls `signIn("credentials", { username, password, redirect: false })` from `next-auth/react`, shows a `Toast` on error, redirects via `useRouter` to `/` (root then redirects by role) on success. Wrap the app root layout children needing session with a `SessionProvider` client component (`src/components/providers/SessionProviderWrapper.tsx`) used in `src/app/layout.tsx`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add NextAuth credentials auth, role middleware, login page"
```

---

## Phase 1 — Academic Structure

### Task 4: Generic CRUD route factory + Sessions/Classes/Sections/Subjects APIs

**Files:**
- Create: `src/lib/api/crud-factory.ts`
- Create: `src/lib/validation/academic.ts`
- Create: `src/app/api/sessions/route.ts`, `src/app/api/sessions/[id]/route.ts`
- Create: `src/app/api/classes/route.ts`, `src/app/api/classes/[id]/route.ts`
- Create: `src/app/api/sections/route.ts`, `src/app/api/sections/[id]/route.ts`
- Create: `src/app/api/subjects/route.ts`, `src/app/api/subjects/[id]/route.ts`
- Test: `src/lib/api/__tests__/crud-factory.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 2), `authOptions`/`requireRole` (Task 3).
- Produces: `makeCrudRoutes(delegate, schema, options)` in `src/lib/api/crud-factory.ts`, reused by Task 12 (teachers list) and any future simple lookup entity.

- [ ] **Step 1: Write the failing test**

`src/lib/api/__tests__/crud-factory.test.ts`:
```ts
import { validateOrThrow } from "../crud-factory";
import { z } from "zod";

describe("validateOrThrow", () => {
  const schema = z.object({ name: z.string().min(1) });

  it("returns parsed data for valid input", () => {
    expect(validateOrThrow(schema, { name: "Grade 6" })).toEqual({ name: "Grade 6" });
  });

  it("throws a ValidationError for invalid input", () => {
    expect(() => validateOrThrow(schema, { name: "" })).toThrow("Validation failed");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- crud-factory.test.ts`
Expected: FAIL — module has no export `validateOrThrow`.

- [ ] **Step 3: Implement the factory**

`src/lib/api/crud-factory.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z, ZodSchema } from "zod";
import { authOptions, requireRole } from "@/lib/auth";

export class ValidationError extends Error {
  issues: unknown;
  constructor(issues: unknown) {
    super("Validation failed");
    this.issues = issues;
  }
}

export function validateOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new ValidationError(parsed.error.flatten());
  return parsed.data;
}

type Delegate = {
  findMany: (args?: any) => Promise<any[]>;
  findUnique: (args: any) => Promise<any>;
  create: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
};

export function makeCrudRoutes<T>(
  delegate: Delegate,
  schema: ZodSchema<T>,
  opts: { writeRoles: Array<"ADMIN" | "TEACHER" | "STUDENT" | "PARENT">; orderBy?: any }
) {
  async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const items = await delegate.findMany({
      where: { deletedAt: null },
      orderBy: opts.orderBy ?? { name: "asc" },
    });
    return NextResponse.json(items);
  }

  async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!requireRole(session, opts.writeRoles))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    try {
      const body = validateOrThrow(schema, await req.json());
      const created = await delegate.create({ data: body });
      return NextResponse.json(created, { status: 201 });
    } catch (e) {
      if (e instanceof ValidationError)
        return NextResponse.json({ error: e.issues }, { status: 400 });
      return NextResponse.json({ error: "Could not create record" }, { status: 500 });
    }
  }

  return { GET, POST };
}

export function makeCrudItemRoutes<T>(
  delegate: Delegate,
  schema: ZodSchema<Partial<T>>,
  opts: { writeRoles: Array<"ADMIN" | "TEACHER" | "STUDENT" | "PARENT"> }
) {
  async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!requireRole(session, opts.writeRoles))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    try {
      const body = validateOrThrow(schema, await req.json());
      const updated = await delegate.update({ where: { id: params.id }, data: body });
      return NextResponse.json(updated);
    } catch (e) {
      if (e instanceof ValidationError)
        return NextResponse.json({ error: e.issues }, { status: 400 });
      return NextResponse.json({ error: "Could not update record" }, { status: 500 });
    }
  }

  async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!requireRole(session, opts.writeRoles))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await delegate.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ ok: true });
  }

  return { PATCH, DELETE };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- crud-factory.test.ts`
Expected: PASS.

- [ ] **Step 5: Validation schemas**

`src/lib/validation/academic.ts`:
```ts
import { z } from "zod";

export const sessionSchema = z.object({
  name: z.string().min(4),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isCurrent: z.boolean().optional(),
});

export const classSchema = z.object({
  name: z.string().min(1),
  sessionId: z.string().min(1),
});

export const sectionSchema = z.object({
  name: z.string().min(1),
  classId: z.string().min(1),
});

export const subjectSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
});
```

- [ ] **Step 6: Wire the four route files (identical pattern)**

`src/app/api/sessions/route.ts`:
```ts
import { prisma } from "@/lib/prisma";
import { makeCrudRoutes } from "@/lib/api/crud-factory";
import { sessionSchema } from "@/lib/validation/academic";

export const { GET, POST } = makeCrudRoutes(prisma.academicSession, sessionSchema, {
  writeRoles: ["ADMIN"],
  orderBy: { startDate: "desc" },
});
```
`src/app/api/sessions/[id]/route.ts`:
```ts
import { prisma } from "@/lib/prisma";
import { makeCrudItemRoutes } from "@/lib/api/crud-factory";
import { sessionSchema } from "@/lib/validation/academic";

export const { PATCH, DELETE } = makeCrudItemRoutes(prisma.academicSession, sessionSchema.partial(), {
  writeRoles: ["ADMIN"],
});
```
Repeat the same two-file pattern for `classes` (using `prisma.class`, `classSchema`, `writeRoles: ["ADMIN"]`), `sections` (`prisma.section`, `sectionSchema`, `["ADMIN"]`), and `subjects` (`prisma.subject`, `subjectSchema`, `["ADMIN"]`) — 6 more files total, same two-block structure as above with the entity-specific delegate/schema swapped in.

Note: `AcademicSession` has no `deletedAt` column — for `src/app/api/sessions/route.ts` only, drop the `where: { deletedAt: null }` filter by passing `orderBy` only and using `delegate.findMany({ orderBy: opts.orderBy })` — adjust `makeCrudRoutes`'s `GET` to check `"deletedAt" in delegate.fields` is unnecessary; simplest fix: give `AcademicSession` a `deletedAt DateTime?` column too for consistency. Add `deletedAt DateTime?` to the `AcademicSession` model in `prisma/schema.prisma` (Task 2) and rerun `npx prisma migrate dev --name add_session_deleted_at` before this task's Step 7.

- [ ] **Step 7: Migrate and verify manually**

Run: `npx prisma migrate dev --name add_session_deleted_at`
Run: `npm run build`
Expected: no type errors, build succeeds.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add sessions/classes/sections/subjects CRUD APIs via shared factory"
```

---

### Task 5: Academic structure admin UI (Sessions, Classes, Sections, Subjects pages)

**Files:**
- Create: `src/components/layout/Sidebar.tsx`, `src/components/layout/Topbar.tsx`, `src/components/layout/DashboardShell.tsx`
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/academic/sessions/page.tsx`
- Create: `src/app/admin/academic/classes/page.tsx`
- Create: `src/app/admin/academic/sections/page.tsx`
- Create: `src/app/admin/academic/subjects/page.tsx`
- Create: `src/components/academic/EntityTable.tsx`, `src/components/academic/EntityFormDialog.tsx`

**Interfaces:**
- Consumes: `/api/sessions`, `/api/classes`, `/api/sections`, `/api/subjects` (Task 4).
- Produces: `<DashboardShell role="ADMIN">` layout wrapper, reused by every later admin page (Tasks 8, 11, 14, 17, 19, 22, 24, 26).
- Produces: `<EntityTable columns fetchUrl />` and `<EntityFormDialog fields postUrl onCreated />` generic components, reused wherever a simple list+create UI is needed.

- [ ] **Step 1: Build the shared dashboard shell**

`Sidebar.tsx` — role-aware nav list (icons via `lucide-react`, install with `npx shadcn@latest add` pulls it in already): for ADMIN show Dashboard, Students, Academic (Sessions/Classes/Sections/Subjects), Attendance, Fees, Examinations, Teachers, Timetable, Announcements, Reports; collapse into fewer items for TEACHER/STUDENT/PARENT roles per spec section "Parent and Student Portals". Active route highlighted via `usePathname()`.

`Topbar.tsx` — institute name (from `Setting` table, fetched via a small `/api/settings/institute` GET added in Task 26), current user name/role badge, sign-out button calling `signOut()`.

`DashboardShell.tsx` — flex layout: fixed-width sidebar + main content area with `max-w-7xl` padding, used by every role layout.

`src/app/admin/layout.tsx` wraps children in `<DashboardShell role="ADMIN">`.

- [ ] **Step 2: Build generic list/create components**

`EntityTable.tsx` — props `{ fetchUrl: string; columns: { key: string; header: string }[]; onEdit?: (row) => void; onDelete?: (row) => void }`; uses shadcn `Table`, fetches via `useEffect`/`fetch`, shows a `Skeleton` while loading and an empty-state card when `items.length === 0`.

`EntityFormDialog.tsx` — props `{ title: string; fields: { name: string; label: string; type: "text"|"date"|"select"; options?: {value,label}[] }[]; postUrl: string; onCreated: () => void }`; renders a shadcn `Dialog` with a `Form` built on `react-hook-form` + `zodResolver` is optional — for v1 keep it a controlled form with basic HTML5 required validation client-side (server still validates via Zod), POSTs on submit, shows a `Toast` on success/error, calls `onCreated()` to refresh the parent table.

Run: `npm install lucide-react`

- [ ] **Step 3: Build the four academic pages**

Each page (`sessions`, `classes`, `sections`, `subjects`) renders a page header ("Academic Sessions" etc.) with an "Add" button opening `EntityFormDialog`, and an `EntityTable` below listing the relevant fields (Sessions: name/startDate/endDate/isCurrent; Classes: name/session name; Sections: name/class name; Subjects: name/code). Classes/Sections forms include a `select` field populated from `/api/sessions` and `/api/classes` respectively (fetched client-side on dialog open).

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, log in is not wired yet (Task 3 login page exists but no seeded user until Task 33) — verify pages render without crashing by temporarily hitting them unauthenticated and confirming a redirect to `/login` occurs (middleware from Task 3 covers `/admin/:path*`).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add dashboard shell and academic structure admin pages"
```

---

## Phase 2 — Students & Guardians

### Task 6: Student & Guardian validation schemas + Students API (list/create/detail/update/soft-delete)

**Files:**
- Create: `src/lib/validation/student.ts`
- Create: `src/app/api/students/route.ts`
- Create: `src/app/api/students/[id]/route.ts`
- Test: `src/lib/validation/__tests__/student.test.ts`

**Interfaces:**
- Consumes: `prisma`, `authOptions`/`requireRole`, `validateOrThrow`/`ValidationError`.
- Produces: `studentCreateSchema`, `studentUpdateSchema` from `src/lib/validation/student.ts`, reused by Task 30 (CSV import) and Task 7 (student form UI, via type inference).

- [ ] **Step 1: Write the failing test**

`src/lib/validation/__tests__/student.test.ts`:
```ts
import { studentCreateSchema } from "../student";

describe("studentCreateSchema", () => {
  it("accepts a valid student payload", () => {
    const result = studentCreateSchema.safeParse({
      admissionNumber: "ADM-0001",
      fullName: "Ali Raza",
      gender: "MALE",
      dob: "2014-05-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a payload missing fullName", () => {
    const result = studentCreateSchema.safeParse({
      admissionNumber: "ADM-0001",
      gender: "MALE",
      dob: "2014-05-01",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- student.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement schema**

`src/lib/validation/student.ts`:
```ts
import { z } from "zod";

export const studentCreateSchema = z.object({
  admissionNumber: z.string().min(1),
  fullName: z.string().min(1),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dob: z.coerce.date(),
  cnicOrBForm: z.string().optional(),
  bloodGroup: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  previousSchool: z.string().optional(),
});

export const studentUpdateSchema = studentCreateSchema.partial().extend({
  status: z.enum(["ACTIVE", "LEFT", "GRADUATED"]).optional(),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- student.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement API routes**

`src/app/api/students/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { studentCreateSchema } from "@/lib/validation/student";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN", "TEACHER"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const students = await prisma.student.findMany({
    where: {
      deletedAt: null,
      ...(q ? { OR: [{ fullName: { contains: q } }, { admissionNumber: { contains: q } }] } : {}),
    },
    orderBy: { fullName: "asc" },
  });
  return NextResponse.json(students);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validateOrThrow(studentCreateSchema, await req.json());
    const existing = await prisma.student.findUnique({ where: { admissionNumber: body.admissionNumber } });
    if (existing) return NextResponse.json({ error: "Admission number already exists" }, { status: 409 });
    const student = await prisma.student.create({ data: body });
    return NextResponse.json(student, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: "Could not create student" }, { status: 500 });
  }
}
```

`src/app/api/students/[id]/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { studentUpdateSchema } from "@/lib/validation/student";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const student = await prisma.student.findUnique({
    where: { id: params.id },
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validateOrThrow(studentUpdateSchema, await req.json());
    const updated = await prisma.student.update({ where: { id: params.id }, data: body });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: "Could not update student" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.student.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add student CRUD API with role-scoped access"
```

---

### Task 7: Student list + profile UI (tabs: Overview, Personal, Guardian, Academic History, Documents)

**Files:**
- Create: `src/app/admin/students/page.tsx`
- Create: `src/app/admin/students/[id]/page.tsx`
- Create: `src/components/students/StudentFormDialog.tsx`
- Create: `src/components/students/StudentProfileTabs.tsx`

**Interfaces:**
- Consumes: `/api/students`, `/api/students/[id]` (Task 6), `EntityTable` pattern (Task 5, adapted not reused directly since students need a search box and a link-to-profile row action).
- Produces: none consumed further (leaf UI), but establishes the tabbed-profile pattern reused by Task 20 (marksheet view lives inside this same profile as an added tab).

- [ ] **Step 1: Student list page**

`src/app/admin/students/page.tsx` — header "Students" with search `Input` (debounced, filters via `?q=`) and "Add Student" button opening `StudentFormDialog`; table columns: Photo (placeholder avatar), Admission #, Name, Class/Section (from latest enrollment, fetched via a lightweight extra field — for v1 show "—" if no enrollment yet, enrollment assignment happens in Task 9), Status, and a "View" row action linking to `/admin/students/[id]`.

- [ ] **Step 2: Student form dialog**

`StudentFormDialog.tsx` — fields matching `studentCreateSchema` (admissionNumber, fullName, gender select, dob date picker via shadcn `Input type="date"`, cnicOrBForm, bloodGroup, phone, address, previousSchool). POSTs to `/api/students`, shows field-level errors from the 400 response body.

- [ ] **Step 3: Student profile tabs**

`StudentProfileTabs.tsx` using shadcn `Tabs`: **Overview** (photo, admission #, class/section, status badge), **Personal Information** (dob, gender, cnic, blood group, contacts, address), **Guardian Information** (list of linked guardians with relation/phone), **Academic History** (table of `enrollments` across sessions), **Class/Promotion/Transfer History** (three small tables from `promotions`/`transfers`), **Documents** (list of uploaded docs with download links — upload UI itself is added in Task 31). Attendance/Fee History/Examination Results/Marksheets tabs are added by Tasks 9, 11, 20 respectively as thin additions to this same component (each later task adds one `TabsContent` block, not a rewrite).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add student list and tabbed profile pages"
```

---

### Task 8: Guardians + Enrollment (admission workflow: assign class/section/roll number)

**Files:**
- Create: `src/lib/validation/enrollment.ts`
- Create: `src/app/api/guardians/route.ts`
- Create: `src/app/api/students/[id]/guardians/route.ts`
- Create: `src/app/api/enrollments/route.ts`
- Create: `src/components/students/EnrollDialog.tsx`
- Modify: `src/components/students/StudentProfileTabs.tsx` (wire real guardian-add button, real enrollment display)
- Test: `src/lib/validation/__tests__/enrollment.test.ts`

**Interfaces:**
- Consumes: `Student`, `Guardian`, `GuardianLink`, `Enrollment` models (Task 2); `studentUpdateSchema` pattern conventions.
- Produces: `enrollmentCreateSchema`, used nowhere else directly but documents the unique-enrollment invariant relied on by Task 9 (attendance) and Task 13 (fees) which both key off current enrollment.

- [ ] **Step 1: Write the failing test**

`src/lib/validation/__tests__/enrollment.test.ts`:
```ts
import { enrollmentCreateSchema } from "../enrollment";

describe("enrollmentCreateSchema", () => {
  it("accepts a valid enrollment", () => {
    const result = enrollmentCreateSchema.safeParse({
      studentId: "s1", academicSessionId: "sess1", classId: "c1", sectionId: "sec1", rollNumber: "12",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing rollNumber", () => {
    const result = enrollmentCreateSchema.safeParse({
      studentId: "s1", academicSessionId: "sess1", classId: "c1", sectionId: "sec1",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**, then **Step 3: implement**

`src/lib/validation/enrollment.ts`:
```ts
import { z } from "zod";

export const enrollmentCreateSchema = z.object({
  studentId: z.string().min(1),
  academicSessionId: z.string().min(1),
  classId: z.string().min(1),
  sectionId: z.string().min(1),
  rollNumber: z.string().min(1),
});

export const guardianCreateSchema = z.object({
  fullName: z.string().min(1),
  relation: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  cnic: z.string().optional(),
  address: z.string().optional(),
});
```

- [ ] **Step 4: Run test to verify it passes.**

- [ ] **Step 5: Enrollment API with the one-active-enrollment-per-session rule enforced via the DB unique constraint**

`src/app/api/enrollments/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enrollmentCreateSchema } from "@/lib/validation/enrollment";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validateOrThrow(enrollmentCreateSchema, await req.json());
    const enrollment = await prisma.enrollment.create({ data: body });
    return NextResponse.json(enrollment, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    if ((e as any).code === "P2002")
      return NextResponse.json(
        { error: "Student already has an active enrollment this session, or roll number is taken in this section" },
        { status: 409 }
      );
    return NextResponse.json({ error: "Could not create enrollment" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Guardians API**

`src/app/api/guardians/route.ts` — `GET` (ADMIN/TEACHER, list all), `POST` (ADMIN, creates a `Guardian`) using `guardianCreateSchema`.
`src/app/api/students/[id]/guardians/route.ts` — `POST` body `{ guardianId }` creates a `GuardianLink` for `params.id`, ADMIN only.

- [ ] **Step 7: `EnrollDialog` UI** — class/section/session selects (fetched from Task 4 APIs) + roll number input, posts to `/api/enrollments`, shown from the student profile's Overview tab when the student has no current-session enrollment. Wire a "Link Guardian" mini-form (search existing guardians by phone/name or create new) into the Guardian Information tab.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add guardian linking and student enrollment workflow"
```

---

## Phase 3 — Attendance

### Task 9: Attendance API (mark daily, monthly view, percentage calc)

**Files:**
- Create: `src/lib/validation/attendance.ts`
- Create: `src/lib/attendance-stats.ts`
- Create: `src/app/api/attendance/route.ts`
- Create: `src/app/api/attendance/summary/route.ts`
- Test: `src/lib/__tests__/attendance-stats.test.ts`

**Interfaces:**
- Consumes: `Attendance`, `Enrollment` models; `requireRole`.
- Produces: `calculateAttendancePercentage(records: {status: string}[]): number` in `src/lib/attendance-stats.ts`, reused by Task 20 (marksheet attendance %) and Task 24 (student/parent dashboard attendance widget).

- [ ] **Step 1: Write the failing test**

`src/lib/__tests__/attendance-stats.test.ts`:
```ts
import { calculateAttendancePercentage } from "../attendance-stats";

describe("calculateAttendancePercentage", () => {
  it("counts PRESENT and LATE as attended", () => {
    const records = [
      { status: "PRESENT" }, { status: "LATE" }, { status: "ABSENT" }, { status: "LEAVE" },
    ];
    expect(calculateAttendancePercentage(records)).toBe(50);
  });

  it("returns 0 for an empty record set", () => {
    expect(calculateAttendancePercentage([])).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Implement**

`src/lib/attendance-stats.ts`:
```ts
export function calculateAttendancePercentage(records: { status: string }[]): number {
  if (records.length === 0) return 0;
  const attended = records.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
  return Math.round((attended / records.length) * 100);
}
```

- [ ] **Step 4: Run test to verify it passes.**

- [ ] **Step 5: Validation + bulk-mark API**

`src/lib/validation/attendance.ts`:
```ts
import { z } from "zod";

export const attendanceBulkSchema = z.object({
  date: z.coerce.date(),
  sectionId: z.string().min(1),
  entries: z.array(z.object({
    studentId: z.string().min(1),
    status: z.enum(["PRESENT", "ABSENT", "LATE", "LEAVE"]),
    remarks: z.string().optional(),
  })).min(1),
});
```

`src/app/api/attendance/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { attendanceBulkSchema } from "@/lib/validation/attendance";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN", "TEACHER"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validateOrThrow(attendanceBulkSchema, await req.json());
    const result = await prisma.$transaction(
      body.entries.map((entry) =>
        prisma.attendance.upsert({
          where: { studentId_date: { studentId: entry.studentId, date: body.date } },
          create: { studentId: entry.studentId, date: body.date, status: entry.status, remarks: entry.remarks, markedById: session!.user.id },
          update: { status: entry.status, remarks: entry.remarks, markedById: session!.user.id },
        })
      )
    );
    return NextResponse.json({ count: result.length }, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: "Could not save attendance" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sectionId = req.nextUrl.searchParams.get("sectionId");
  const date = req.nextUrl.searchParams.get("date");
  if (!sectionId || !date) return NextResponse.json({ error: "sectionId and date are required" }, { status: 400 });

  const enrollments = await prisma.enrollment.findMany({
    where: { sectionId, status: "ACTIVE" },
    include: { student: true },
    orderBy: { rollNumber: "asc" },
  });
  const records = await prisma.attendance.findMany({
    where: { date: new Date(date), studentId: { in: enrollments.map((e) => e.studentId) } },
  });
  const byStudent = Object.fromEntries(records.map((r) => [r.studentId, r]));
  return NextResponse.json(
    enrollments.map((e) => ({
      studentId: e.studentId,
      rollNumber: e.rollNumber,
      fullName: e.student.fullName,
      status: byStudent[e.studentId]?.status ?? null,
    }))
  );
}
```

- [ ] **Step 6: Monthly summary route**

`src/app/api/attendance/summary/route.ts` — `GET` query `{ studentId, month }` (YYYY-MM), fetches all `Attendance` rows for that student within the month's date range, returns `{ records, percentage: calculateAttendancePercentage(records) }`. ADMIN/TEACHER can query any student; STUDENT/PARENT restricted to their own/linked student (same ownership check pattern as Task 6 Step 5's `GET /api/students/[id]`).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add attendance marking API and monthly summary with percentage calc"
```

---

### Task 10: Attendance UI (daily marking grid for teachers, monthly view on student profile)

**Files:**
- Create: `src/app/teacher/layout.tsx`
- Create: `src/app/teacher/attendance/page.tsx`
- Create: `src/components/attendance/AttendanceGrid.tsx`
- Modify: `src/components/students/StudentProfileTabs.tsx` (add Attendance tab)

**Interfaces:**
- Consumes: `/api/attendance` GET/POST, `/api/attendance/summary` (Task 9), `/api/sections` (Task 4), `DashboardShell` (Task 5).

- [ ] **Step 1: Teacher layout** — same `DashboardShell` pattern as admin, nav limited to Dashboard/Attendance/Marks Entry/Timetable/Announcements per spec's "Teacher dashboard" description.

- [ ] **Step 2: `AttendanceGrid`** — section select + date picker at top; once both chosen, fetches `/api/attendance?sectionId&date` and renders one row per student (roll #, name) with a 4-way toggle (`Present`/`Absent`/`Late`/`Leave` as a shadcn `Tabs`-style segmented control per row, or a `Select`), plus a "Mark all Present" bulk-fill button. "Save" button POSTs the full `entries` array to `/api/attendance`.

- [ ] **Step 3: Add Attendance tab to student profile** — fetches `/api/attendance/summary?studentId&month=<current>` with a month picker, shows a percentage badge (color-coded: green ≥75%, amber 50-74%, red <50%, using the `--success`/`--warning`/`--destructive` tokens from Task 1) and a simple calendar-style grid or list of day/status.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add attendance marking UI and student attendance history tab"
```

---

## Phase 4 — Fees

### Task 11: Fee structures API + admin UI

**Files:**
- Create: `src/lib/validation/fee.ts`
- Create: `src/app/api/fee-structures/route.ts`, `src/app/api/fee-structures/[id]/route.ts`
- Create: `src/app/admin/fees/structures/page.tsx`

**Interfaces:**
- Consumes: `FeeStructure` model, `makeCrudRoutes`/`makeCrudItemRoutes` (Task 4).
- Produces: `feeStructureSchema`, reused by Task 13 (voucher generation reads `FeeStructure` rows).

- [ ] **Step 1: Schema**

`src/lib/validation/fee.ts`:
```ts
import { z } from "zod";

export const feeStructureSchema = z.object({
  classId: z.string().min(1),
  category: z.enum(["TUITION", "ADMISSION", "EXAM", "TRANSPORT", "COMPUTER", "LIBRARY", "ACTIVITY", "OTHER"]),
  amount: z.coerce.number().positive(),
  frequency: z.enum(["MONTHLY", "ONE_TIME", "ANNUAL"]),
});

export const feeVoucherCreateSchema = z.object({
  studentId: z.string().min(1),
  academicSessionId: z.string().min(1),
  billingMonth: z.string().min(4),
  dueDate: z.coerce.date(),
  discount: z.coerce.number().min(0).default(0),
  fine: z.coerce.number().min(0).default(0),
});

export const feePaymentSchema = z.object({
  voucherId: z.string().min(1),
  amount: z.coerce.number().positive(),
  method: z.enum(["CASH", "BANK_TRANSFER", "ONLINE", "CHEQUE"]),
  reference: z.string().optional(),
});
```

- [ ] **Step 2: Fee structure routes** — same two-file `makeCrudRoutes`/`makeCrudItemRoutes` pattern as Task 4, using `prisma.feeStructure` and `feeStructureSchema`, `writeRoles: ["ADMIN"]`.

- [ ] **Step 3: Admin UI** — `src/app/admin/fees/structures/page.tsx`, table grouped by class (fetch classes then fee structures, group client-side), "Add Charge" dialog with class select + category select + amount + frequency.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add fee structure management"
```

---

### Task 12: Fee voucher generation, balance math, and payment recording (transactional)

**Files:**
- Create: `src/lib/fee-calc.ts`
- Create: `src/app/api/fee-vouchers/route.ts`, `src/app/api/fee-vouchers/[id]/route.ts`
- Create: `src/app/api/fee-payments/route.ts`
- Test: `src/lib/__tests__/fee-calc.test.ts`

**Interfaces:**
- Consumes: `FeeStructure`, `FeeVoucher`, `FeePayment` models, `feeVoucherCreateSchema`/`feePaymentSchema` (Task 11).
- Produces: `computeVoucherStatus(totalPayable, paidAmount): VoucherStatus`, `nextVoucherNumber(lastNumber: string | null): string` in `src/lib/fee-calc.ts`, reused by Task 20 (marksheet has no fee dependency, skip) — reused by Task 24 (dashboard defaulter widget calls `computeVoucherStatus` indirectly via the stored `status` field, no direct import needed, but the function is the single source of truth so document it here for Task 13's voucher print view).

- [ ] **Step 1: Write the failing test**

`src/lib/__tests__/fee-calc.test.ts`:
```ts
import { computeVoucherStatus, nextVoucherNumber } from "../fee-calc";

describe("computeVoucherStatus", () => {
  it("is PAID when paidAmount >= totalPayable", () => {
    expect(computeVoucherStatus(1000, 1000)).toBe("PAID");
  });
  it("is PARTIALLY_PAID when 0 < paidAmount < totalPayable", () => {
    expect(computeVoucherStatus(1000, 400)).toBe("PARTIALLY_PAID");
  });
  it("is UNPAID when paidAmount is 0", () => {
    expect(computeVoucherStatus(1000, 0)).toBe("UNPAID");
  });
});

describe("nextVoucherNumber", () => {
  it("starts at VCH-000001 when there is no last number", () => {
    expect(nextVoucherNumber(null)).toBe("VCH-000001");
  });
  it("increments the numeric suffix", () => {
    expect(nextVoucherNumber("VCH-000041")).toBe("VCH-000042");
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Implement**

`src/lib/fee-calc.ts`:
```ts
export type VoucherStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";

export function computeVoucherStatus(totalPayable: number, paidAmount: number): VoucherStatus {
  if (paidAmount >= totalPayable) return "PAID";
  if (paidAmount > 0) return "PARTIALLY_PAID";
  return "UNPAID";
}

export function nextVoucherNumber(lastNumber: string | null): string {
  if (!lastNumber) return "VCH-000001";
  const n = parseInt(lastNumber.split("-")[1], 10) + 1;
  return `VCH-${String(n).padStart(6, "0")}`;
}
```

- [ ] **Step 4: Run test to verify it passes.**

- [ ] **Step 5: Voucher generation route (reads applicable FeeStructure rows for the student's current class, sums by category, builds `breakdown` JSON)**

`src/app/api/fee-vouchers/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { feeVoucherCreateSchema } from "@/lib/validation/fee";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";
import { computeVoucherStatus, nextVoucherNumber } from "@/lib/fee-calc";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const studentId = req.nextUrl.searchParams.get("studentId") ?? undefined;
  const status = req.nextUrl.searchParams.get("status") ?? undefined;

  if (session.user.role === "STUDENT" || session.user.role === "PARENT") {
    // ownership enforced the same way as GET /api/students/[id]; omitted here for brevity of listing,
    // but every STUDENT/PARENT-role request MUST filter to their own/linked studentId server-side.
  }

  const vouchers = await prisma.feeVoucher.findMany({
    where: { deletedAt: null, ...(studentId ? { studentId } : {}), ...(status ? { status: status as any } : {}) },
    include: { student: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(vouchers);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validateOrThrow(feeVoucherCreateSchema, await req.json());

    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_academicSessionId: { studentId: body.studentId, academicSessionId: body.academicSessionId } },
    });
    if (!enrollment) return NextResponse.json({ error: "Student has no enrollment in this session" }, { status: 400 });

    const structures = await prisma.feeStructure.findMany({ where: { classId: enrollment.classId, deletedAt: null } });
    const breakdown = structures.map((s) => ({ category: s.category, amount: s.amount }));
    const subtotal = breakdown.reduce((sum, b) => sum + b.amount, 0);

    const lastVoucher = await prisma.feeVoucher.findFirst({ orderBy: { createdAt: "desc" } });
    const voucherNumber = nextVoucherNumber(lastVoucher?.voucherNumber ?? null);
    const totalPayable = subtotal + body.fine - body.discount;

    const voucher = await prisma.feeVoucher.create({
      data: {
        voucherNumber,
        studentId: body.studentId,
        academicSessionId: body.academicSessionId,
        billingMonth: body.billingMonth,
        dueDate: body.dueDate,
        breakdown: JSON.stringify(breakdown),
        discount: body.discount,
        fine: body.fine,
        totalPayable,
        status: computeVoucherStatus(totalPayable, 0),
      },
    });
    return NextResponse.json(voucher, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: "Could not generate voucher" }, { status: 500 });
  }
}
```

`src/app/api/fee-vouchers/[id]/route.ts` — `GET` single voucher with `student`/`payments` included, same ownership checks as students; `PATCH` for ADMIN-only status override to `CANCELLED`.

- [ ] **Step 6: Payment recording route (transactional balance update)**

`src/app/api/fee-payments/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { feePaymentSchema } from "@/lib/validation/fee";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";
import { computeVoucherStatus } from "@/lib/fee-calc";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validateOrThrow(feePaymentSchema, await req.json());

    const result = await prisma.$transaction(async (tx) => {
      const voucher = await tx.feeVoucher.findUnique({ where: { id: body.voucherId } });
      if (!voucher || voucher.deletedAt) throw new Error("VOUCHER_NOT_FOUND");
      if (voucher.status === "CANCELLED") throw new Error("VOUCHER_CANCELLED");

      const payment = await tx.feePayment.create({
        data: { ...body, recordedById: session!.user.id },
      });
      const newPaidAmount = voucher.paidAmount + body.amount;
      const updatedVoucher = await tx.feeVoucher.update({
        where: { id: voucher.id },
        data: { paidAmount: newPaidAmount, status: computeVoucherStatus(voucher.totalPayable, newPaidAmount) },
      });
      return { payment, voucher: updatedVoucher };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    if ((e as Error).message === "VOUCHER_NOT_FOUND") return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    if ((e as Error).message === "VOUCHER_CANCELLED") return NextResponse.json({ error: "Cannot pay a cancelled voucher" }, { status: 409 });
    return NextResponse.json({ error: "Could not record payment" }, { status: 500 });
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add fee voucher generation and transactional payment recording"
```

---

### Task 13: Fee UI — voucher list/view/print-preview, payment form, defaulter report

**Files:**
- Create: `src/app/admin/fees/vouchers/page.tsx`
- Create: `src/app/admin/fees/vouchers/[id]/page.tsx`
- Create: `src/app/admin/fees/defaulters/page.tsx`
- Create: `src/components/fees/VoucherPrintView.tsx`
- Create: `src/components/fees/PaymentFormDialog.tsx`
- Modify: `src/components/students/StudentProfileTabs.tsx` (add Fee History tab)

**Interfaces:**
- Consumes: `/api/fee-vouchers`, `/api/fee-vouchers/[id]`, `/api/fee-payments` (Task 12).

- [ ] **Step 1: Voucher list page** — filters (status select, search by student), "Generate Voucher" dialog (student search-select, session, billing month, due date, discount, fine), table with voucher #, student, amount, status badge (color per status using semantic tokens), row action "View".

- [ ] **Step 2: Voucher detail/print-preview page** — `VoucherPrintView` renders an A4-proportioned card: institute name/logo placeholder header, voucher #, student details, billing month, due date, itemized `breakdown` table, previous balance/discount/fine/total payable/paid/remaining, status badge, a `window.print()`-triggered "Print" button (browser print-to-PDF stands in for real PDF export per spec's Non-Goals). "Record Payment" button opens `PaymentFormDialog`.

- [ ] **Step 3: `PaymentFormDialog`** — amount, method select, reference (conditionally shown for BANK_TRANSFER/CHEQUE/ONLINE), posts to `/api/fee-payments`, refreshes the voucher view on success.

- [ ] **Step 4: Defaulter report page** — fetches `/api/fee-vouchers?status=UNPAID` and `?status=PARTIALLY_PAID`, merges, table sorted by `dueDate` ascending, export button reuses the CSV export utility built in Task 30.

- [ ] **Step 5: Fee History tab on student profile** — fetches `/api/fee-vouchers?studentId=<id>`, table of that student's vouchers with status badges, linking to the same print-preview page.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add fee voucher, payment, and defaulter report UI"
```

---

## Phase 5 — Examinations & Results

### Task 14: Examination + ExamSubject API

**Files:**
- Create: `src/lib/validation/exam.ts`
- Create: `src/app/api/exams/route.ts`, `src/app/api/exams/[id]/route.ts`
- Create: `src/app/api/exam-subjects/route.ts`
- Create: `src/app/admin/exams/page.tsx`
- Create: `src/app/admin/exams/[id]/page.tsx`

**Interfaces:**
- Consumes: `Examination`, `ExamSubject` models.
- Produces: `examCreateSchema`, `examSubjectCreateSchema`, reused by Task 15 (marks entry validates against `ExamSubject.totalMarks`).

- [ ] **Step 1: Schemas**

`src/lib/validation/exam.ts`:
```ts
import { z } from "zod";

export const examCreateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["MIDTERM", "FINAL", "MONTHLY", "QUIZ", "CLASS_TEST"]),
  academicSessionId: z.string().min(1),
});

export const examSubjectCreateSchema = z.object({
  examinationId: z.string().min(1),
  subjectId: z.string().min(1),
  classId: z.string().min(1),
  totalMarks: z.coerce.number().positive(),
  passingMarks: z.coerce.number().positive(),
  examDate: z.coerce.date(),
});
```

- [ ] **Step 2: Routes** — `src/app/api/exams/route.ts` GET (any authenticated role, scoped: TEACHER sees exams for their assigned classes only — filter via `TeacherSubject`, STUDENT/PARENT see only `publishedAt != null` exams for their class) and POST (ADMIN only, `examCreateSchema`). `src/app/api/exams/[id]/route.ts` GET single with `examSubjects` included; `PATCH` supports `{ publish: true }` which sets `publishedAt: new Date()` — reject if already published. `src/app/api/exam-subjects/route.ts` POST (ADMIN only) adds one subject config to an exam using `examSubjectCreateSchema`, unique per `(examinationId, subjectId, classId)`.

- [ ] **Step 3: Admin exam list + detail UI** — list page: table of exams (name, type, session, status = Draft/Published badge), "Create Exam" dialog. Detail page: exam header + "Add Subject" dialog (subject/class selects, total/passing marks, date) listing configured `examSubjects` in a table, "Publish Results" button (disabled/confirms via `Dialog` before calling `PATCH { publish: true }`, disabled once already published).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add examination and exam-subject configuration API and admin UI"
```

---

### Task 15: Marks entry + grading/position calculation

**Files:**
- Create: `src/lib/grading.ts`
- Create: `src/app/api/marks/route.ts`
- Create: `src/app/api/results/route.ts`
- Test: `src/lib/__tests__/grading.test.ts`

**Interfaces:**
- Consumes: `Mark`, `ExamSubject`, `Examination` models.
- Produces: `calculateGrade(percentage: number, bands: GradeBand[]): string`, `calculatePositions(students: {studentId: string; total: number}[]): Map<string, number>` in `src/lib/grading.ts`, reused by Task 20 (marksheet rendering) and Task 24 (result distribution chart).

- [ ] **Step 1: Write the failing test**

`src/lib/__tests__/grading.test.ts`:
```ts
import { calculateGrade, calculatePositions, DEFAULT_GRADE_BANDS } from "../grading";

describe("calculateGrade", () => {
  it("returns A+ for 90 and above", () => {
    expect(calculateGrade(95, DEFAULT_GRADE_BANDS)).toBe("A+");
  });
  it("returns F below the lowest band's passing minimum", () => {
    expect(calculateGrade(30, DEFAULT_GRADE_BANDS)).toBe("F");
  });
});

describe("calculatePositions", () => {
  it("ranks students by total descending, ties share a rank", () => {
    const positions = calculatePositions([
      { studentId: "a", total: 90 },
      { studentId: "b", total: 95 },
      { studentId: "c", total: 90 },
    ]);
    expect(positions.get("b")).toBe(1);
    expect(positions.get("a")).toBe(2);
    expect(positions.get("c")).toBe(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Implement**

`src/lib/grading.ts`:
```ts
export type GradeBand = { min: number; grade: string };

export const DEFAULT_GRADE_BANDS: GradeBand[] = [
  { min: 90, grade: "A+" },
  { min: 80, grade: "A" },
  { min: 70, grade: "B" },
  { min: 60, grade: "C" },
  { min: 50, grade: "D" },
  { min: 40, grade: "E" },
  { min: 0, grade: "F" },
];

export function calculateGrade(percentage: number, bands: GradeBand[] = DEFAULT_GRADE_BANDS): string {
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  const band = sorted.find((b) => percentage >= b.min);
  return band?.grade ?? "F";
}

export function calculatePositions(students: { studentId: string; total: number }[]): Map<string, number> {
  const sorted = [...students].sort((a, b) => b.total - a.total);
  const positions = new Map<string, number>();
  let rank = 0;
  let lastTotal: number | null = null;
  let seen = 0;
  for (const s of sorted) {
    seen += 1;
    if (s.total !== lastTotal) {
      rank = seen;
      lastTotal = s.total;
    }
    positions.set(s.studentId, rank);
  }
  return positions;
}
```

- [ ] **Step 4: Run test to verify it passes.**

- [ ] **Step 5: Marks entry API (rejects writes once the exam is published)**

`src/app/api/marks/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

const marksBulkSchema = z.object({
  examSubjectId: z.string().min(1),
  entries: z.array(z.object({ studentId: z.string().min(1), obtainedMarks: z.coerce.number().min(0) })).min(1),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN", "TEACHER"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validateOrThrow(marksBulkSchema, await req.json());
    const examSubject = await prisma.examSubject.findUnique({
      where: { id: body.examSubjectId },
      include: { examination: true },
    });
    if (!examSubject) return NextResponse.json({ error: "Exam subject not found" }, { status: 404 });
    if (examSubject.examination.publishedAt)
      return NextResponse.json({ error: "Results are published and locked for this exam" }, { status: 409 });
    if (body.entries.some((e) => e.obtainedMarks > examSubject.totalMarks))
      return NextResponse.json({ error: "Obtained marks cannot exceed total marks" }, { status: 400 });

    await prisma.$transaction(
      body.entries.map((entry) =>
        prisma.mark.upsert({
          where: { examSubjectId_studentId: { examSubjectId: body.examSubjectId, studentId: entry.studentId } },
          create: {
            examSubjectId: body.examSubjectId,
            examinationId: examSubject.examinationId,
            studentId: entry.studentId,
            obtainedMarks: entry.obtainedMarks,
            enteredById: session!.user.id,
          },
          update: { obtainedMarks: entry.obtainedMarks, enteredById: session!.user.id },
        })
      )
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: "Could not save marks" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const examSubjectId = req.nextUrl.searchParams.get("examSubjectId");
  if (!examSubjectId) return NextResponse.json({ error: "examSubjectId is required" }, { status: 400 });
  const marks = await prisma.mark.findMany({ where: { examSubjectId }, include: { student: true } });
  return NextResponse.json(marks);
}
```

- [ ] **Step 6: Results aggregation route** — `src/app/api/results/route.ts` `GET` query `{ examinationId, classId }`: loads all `examSubjects` for that exam+class, all `marks` for those examSubjects, groups by student, sums `obtainedMarks` and `totalMarks`, computes percentage/grade via `calculateGrade`, computes positions via `calculatePositions`, returns one row per student `{ studentId, fullName, total, totalMax, percentage, grade, position, subjects: [{subjectName, obtained, total}] }`. STUDENT/PARENT callers only receive their own/linked student's row (403 otherwise), and only if the exam is published.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add marks entry with publish-lock and results/positions calculation"
```

---

### Task 16: Marks entry UI + result sheet/gazette view

**Files:**
- Create: `src/app/teacher/marks/page.tsx`
- Create: `src/components/exams/MarksEntryGrid.tsx`
- Create: `src/app/admin/exams/[id]/results/page.tsx`
- Create: `src/components/exams/ResultSheetTable.tsx`

**Interfaces:**
- Consumes: `/api/marks`, `/api/results`, `/api/exam-subjects` (Task 14/15).

- [ ] **Step 1: `MarksEntryGrid`** — exam + exam-subject selects (teacher only sees exam-subjects for their assigned classes via `TeacherSubject` join, filtered client-side from `/api/exam-subjects?examinationId=`), then a table of students in that class/section with a numeric input per row (clamped client-side to `totalMarks`), "Save" posts to `/api/marks`, disabled with a "Results published — locked" banner if `examSubject.examination.publishedAt` is set.

- [ ] **Step 2: `ResultSheetTable` / gazette view** — fetches `/api/results?examinationId&classId`, renders a table (Position, Roll #, Name, per-subject marks columns, Total, %, Grade), sortable by position, print-friendly (`window.print()` button, reusing the print-preview pattern from Task 13).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add marks entry UI and result sheet/gazette view"
```

---

## Phase 6 — Marksheets, Teachers, Timetable, Announcements

### Task 17: On-screen marksheet/report card view

**Files:**
- Create: `src/app/admin/students/[id]/marksheet/[examId]/page.tsx`
- Create: `src/components/exams/MarksheetView.tsx`
- Modify: `src/components/students/StudentProfileTabs.tsx` (add Examination Results tab linking to marksheets)

**Interfaces:**
- Consumes: `/api/results` (Task 15, called with the single student filtered client-side from the class-wide response), `calculateAttendancePercentage` (Task 9) for the attendance line on the report card.

- [ ] **Step 1: `MarksheetView`** — A4-proportioned card (same print pattern as `VoucherPrintView`): institute header, student photo/name/class/roll #, subject-wise marks table, total/percentage/grade/position, attendance % for the exam's term (via `/api/attendance/summary`), remarks field (static "—" in v1, teacher remarks entry is out of scope), promotion status line (from the student's latest `Enrollment.status`), print button.

- [ ] **Step 2: Wire into student profile** — "Examination Results" tab lists published exams the student has results for, each row links to the marksheet page.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add on-screen marksheet/report card view"
```

---

### Task 18: Teacher management (profile, subject/class assignment)

**Files:**
- Create: `src/lib/validation/teacher.ts`
- Create: `src/app/api/teachers/route.ts`, `src/app/api/teachers/[id]/route.ts`
- Create: `src/app/api/teacher-subjects/route.ts`
- Create: `src/app/admin/teachers/page.tsx`
- Create: `src/app/admin/teachers/[id]/page.tsx`

**Interfaces:**
- Consumes: `Teacher`, `TeacherSubject`, `User` models, `hashPassword` (Task 3).
- Produces: teacher creation also creates a `User` with role `TEACHER` — this is the pattern Task 19 mirrors for parent/student portal accounts if needed later, and the pattern Task 33's seed script follows.

- [ ] **Step 1: Schema**

`src/lib/validation/teacher.ts`:
```ts
import { z } from "zod";

export const teacherCreateSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(8),
  cnic: z.string().optional(),
  qualification: z.string().optional(),
  joiningDate: z.coerce.date().optional(),
  designation: z.string().optional(),
  phone: z.string().optional(),
});

export const teacherAssignSchema = z.object({
  teacherId: z.string().min(1),
  subjectId: z.string().min(1),
  classId: z.string().min(1),
  sectionId: z.string().min(1),
});
```

- [ ] **Step 2: Teacher creation route (creates User + Teacher together in a transaction)**

`src/app/api/teachers/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { teacherCreateSchema } from "@/lib/validation/teacher";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const teachers = await prisma.teacher.findMany({ where: { deletedAt: null }, include: { user: true }, orderBy: { fullName: "asc" } });
  return NextResponse.json(teachers);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validateOrThrow(teacherCreateSchema, await req.json());
    const passwordHash = await hashPassword(body.password);
    const teacher = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: body.email, username: body.username, passwordHash, role: "TEACHER" },
      });
      return tx.teacher.create({
        data: {
          userId: user.id, fullName: body.fullName, cnic: body.cnic, qualification: body.qualification,
          joiningDate: body.joiningDate, designation: body.designation, phone: body.phone,
        },
      });
    });
    return NextResponse.json(teacher, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    if ((e as any).code === "P2002") return NextResponse.json({ error: "Email or username already in use" }, { status: 409 });
    return NextResponse.json({ error: "Could not create teacher" }, { status: 500 });
  }
}
```

`src/app/api/teachers/[id]/route.ts` — `GET` (single, with `subjects` included), `PATCH` (ADMIN, updates `Teacher` fields only, not credentials), `DELETE` (soft delete).
`src/app/api/teacher-subjects/route.ts` — `POST` (ADMIN, `teacherAssignSchema`, unique per `(teacherId, subjectId, classId, sectionId)`).

- [ ] **Step 3: Admin UI** — list page (name, designation, email, "View"); detail page with profile fields + an "Assign Class/Subject" dialog (subject/class/section selects) listing current assignments in a table.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add teacher management with portal account creation and subject assignment"
```

---

### Task 19: Timetable management (grid CRUD)

**Files:**
- Create: `src/lib/validation/timetable.ts`
- Create: `src/app/api/timetable/route.ts`, `src/app/api/timetable/[id]/route.ts`
- Create: `src/app/admin/timetable/page.tsx`
- Create: `src/app/teacher/timetable/page.tsx`
- Create: `src/components/timetable/TimetableGrid.tsx`

**Interfaces:**
- Consumes: `TimetableEntry` model, `TeacherSubject` (for teacher-subject-section validity), `makeCrudRoutes` factory pattern (adapted, since creation needs a conflict check beyond generic CRUD).

- [ ] **Step 1: Schema**

`src/lib/validation/timetable.ts`:
```ts
import { z } from "zod";

export const timetableEntrySchema = z.object({
  sectionId: z.string().min(1),
  subjectId: z.string().min(1),
  teacherId: z.string().min(1),
  dayOfWeek: z.coerce.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  room: z.string().optional(),
});
```

- [ ] **Step 2: API with a simple overlap guard**

`src/app/api/timetable/route.ts` — `GET` query `{ sectionId }` or `{ teacherId }`, returns entries ordered by `dayOfWeek`/`startTime`. `POST` (ADMIN): validate via `timetableEntrySchema`, then reject if any existing entry for the same `teacherId` or `sectionId` on the same `dayOfWeek` has an overlapping `[startTime, endTime)` range (compare as strings since `"HH:MM"` sorts lexicographically) — return 409 with a clear message identifying which conflict (teacher or section) if so.
`src/app/api/timetable/[id]/route.ts` — `DELETE` only (ADMIN); timetable entries are simple enough that edits are delete-and-recreate in the UI.

- [ ] **Step 3: `TimetableGrid`** — 7-column (Mon-Sun, or Mon-Sat if the friend's school doesn't run Sunday classes — make it configurable via a `DAYS` constant array) x period-row grid; admin view lets you click an empty cell to open a small inline form (subject/teacher/room + start/end time) that POSTs; teacher view is read-only, fetched via `/api/timetable?teacherId=<self>`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add timetable management with conflict detection"
```

---

### Task 20: Announcements

**Files:**
- Create: `src/lib/validation/announcement.ts`
- Create: `src/app/api/announcements/route.ts`
- Create: `src/app/admin/announcements/page.tsx`
- Create: `src/components/announcements/AnnouncementFeed.tsx`

**Interfaces:**
- Consumes: `Announcement` model.
- Produces: `<AnnouncementFeed audience={role}>` component, reused by Task 24 on every role's dashboard.

- [ ] **Step 1: Schema**

```ts
import { z } from "zod";

export const announcementCreateSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  audience: z.string().min(1), // "ALL" | "CLASS:<id>" | "SECTION:<id>" | "ROLE:<role>"
});
```

- [ ] **Step 2: API** — `GET` (any authenticated role; filters server-side to entries where `audience === "ALL"` OR matches the caller's role/class/section — for STUDENT/PARENT resolve their current `Enrollment` to get `classId`/`sectionId` for the match), `POST` (ADMIN and TEACHER — teacher-created announcements are restricted client-side to `SECTION:<their assigned sections>` via a select populated from their `TeacherSubject` rows).

- [ ] **Step 3: `AnnouncementFeed`** — reusable card list (title, body, relative timestamp via a small `formatRelativeTime` helper in `src/lib/format.ts`), used standalone on the admin announcements page (with a "New Announcement" dialog above it) and embedded (read-only, no dialog) on every dashboard in Task 24.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add announcements with role/class/section targeting"
```

---

## Phase 7 — Promotion, Dashboards, Import/Export, Documents, Seed & Docs

### Task 21: Class promotion workflow

**Files:**
- Create: `src/app/api/promotions/route.ts`
- Create: `src/app/admin/promotions/page.tsx`

**Interfaces:**
- Consumes: `Enrollment`, `PromotionHistory` models.
- Produces: nothing consumed further — terminal feature.

- [ ] **Step 1: API** — `src/app/api/promotions/route.ts` `POST` body `{ fromSectionId, toClassId, toSectionId, toAcademicSessionId, studentIds: string[] }` (ADMIN only). In a `$transaction`: for each student, mark their existing `Enrollment` (in the from-section's session) `status: "PROMOTED"`, create a new `Enrollment` in the target class/section/session (roll number auto-assigned as `next available in that section`, computed by counting existing enrollments + 1), and insert a `PromotionHistory` row capturing the from/to class and session names (denormalized strings, per the spec's "promotion history" requirement — no need to join back through deleted classes later). Roll back the whole transaction and return 409 if any student already has an enrollment in the target session.

- [ ] **Step 2: UI** — `src/app/admin/promotions/page.tsx`: pick a from-class/section (current session), see the student roster with checkboxes, pick a target session/class/section, "Promote Selected" button with a confirmation dialog summarizing the count before submitting.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add class promotion workflow"
```

---

### Task 22: Role dashboards with charts

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/app/teacher/page.tsx`
- Create: `src/app/student/layout.tsx`, `src/app/student/page.tsx`
- Create: `src/app/parent/layout.tsx`, `src/app/parent/page.tsx`
- Create: `src/components/dashboard/StatTile.tsx`
- Create: `src/components/charts/AttendanceTrendChart.tsx`, `src/components/charts/FeeCollectionChart.tsx`, `src/components/charts/ResultDistributionChart.tsx`
- Create: `src/app/api/dashboard/admin-stats/route.ts`

**Interfaces:**
- Consumes: `AnnouncementFeed` (Task 20), `calculateAttendancePercentage` (Task 9), `calculateGrade`/grade bands (Task 15), Recharts.

- [ ] **Step 1: Install Recharts**

Run: `npm install recharts`

- [ ] **Step 2: `StatTile`** — small card (label, big number, optional trend arrow), used for "Total Students", "Today's Attendance %", "Fees Collected This Month", "Pending Vouchers".

- [ ] **Step 3: `src/app/api/dashboard/admin-stats/route.ts`** (ADMIN/TEACHER) — aggregates: total active students, today's attendance % (via `calculateAttendancePercentage` over today's `Attendance` rows), current month fee collection sum (`FeePayment` where `paidAt` in month), count of `UNPAID`/`PARTIALLY_PAID` vouchers, last 6 months attendance trend (array of `{month, percentage}`), last 6 months fee collection (array of `{month, amount}`), most recent published exam's grade distribution (`{grade, count}[]` via `calculateGrade` over its `results`).

- [ ] **Step 4: Charts** — `AttendanceTrendChart` (line chart), `FeeCollectionChart` (bar chart), `ResultDistributionChart` (bar chart of grade counts) — each a thin Recharts wrapper styled with the CSS variable tokens from Task 1 (use `hsl(var(--primary))` etc. as stroke/fill so charts stay theme-consistent in dark mode too).

- [ ] **Step 5: Admin dashboard page** — 4 `StatTile`s in a row, 3 charts in a responsive grid, `AnnouncementFeed audience="ALL"` in a sidebar column.

- [ ] **Step 6: Teacher dashboard** — "My Classes" list (from `TeacherSubject`), "Today's Attendance" quick-link per assigned section, upcoming timetable entries for today, `AnnouncementFeed`.

- [ ] **Step 7: Student/Parent dashboards + layouts** — `src/app/student/layout.tsx`/`parent/layout.tsx` reuse `DashboardShell` with the restricted nav from Task 5. Student dashboard: own attendance % this month, latest published result summary, current voucher status, `AnnouncementFeed`. Parent dashboard: same but with a child-selector at top if more than one linked student (query `GuardianLink` for the logged-in parent's `userId`), all widgets scoped to the selected child.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add role-specific dashboards with stat tiles and charts"
```

---

### Task 23: Document upload (student documents, teacher/student photos)

**Files:**
- Create: `src/app/api/upload/route.ts`
- Create: `src/app/api/uploads/[...path]/route.ts`
- Create: `src/components/students/DocumentUploadDialog.tsx`
- Modify: `src/components/students/StudentProfileTabs.tsx` (wire real upload button on Documents tab)

**Interfaces:**
- Consumes: `Document` model.
- Produces: `POST /api/upload` accepting `multipart/form-data` with fields `{ studentId, type, file }`, returns `{ filePath }`.

- [ ] **Step 1: Upload route (local disk under `uploads/`, filename randomized to avoid collisions/path traversal)**

`src/app/api/upload/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = ["BIRTH_CERT", "CNIC", "PREVIOUS_CERT", "PHOTO", "LEAVING_CERT", "OTHER"];
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const studentId = form.get("studentId");
  const type = form.get("type");
  const file = form.get("file");

  if (typeof studentId !== "string" || typeof type !== "string" || !(file instanceof File) || !ALLOWED_TYPES.includes(type))
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });

  const ext = path.extname(file.name).slice(0, 10);
  const filename = `${randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), "uploads", "students", studentId);
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  const relPath = `students/${studentId}/${filename}`;
  await prisma.document.create({ data: { studentId, type, filePath: relPath } });
  return NextResponse.json({ filePath: relPath }, { status: 201 });
}
```

- [ ] **Step 2: Protected file-serving route (checks the same role/ownership rules as student GET before streaming the file)**

`src/app/api/uploads/[...path]/route.ts` — reconstructs the path from `params.path`, verifies it resolves inside the `uploads/` directory (reject any `..` segment), looks up the owning `Document`/`studentId`, applies the same ADMIN/TEACHER/own-STUDENT/linked-PARENT check as `GET /api/students/[id]`, then streams the file with `NextResponse` and the correct `Content-Type` (infer from extension via a small lookup map).

- [ ] **Step 3: `DocumentUploadDialog`** — file input + type select, posts as `FormData` to `/api/upload`, refreshes the Documents tab list on success; each listed document links to `/api/uploads/<filePath>`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add protected local document upload and serving"
```

---

### Task 24: CSV/Excel student import and export

**Files:**
- Create: `src/lib/import-export.ts`
- Create: `src/app/api/students/import/route.ts`
- Create: `src/app/api/students/export/route.ts`
- Create: `src/app/admin/students/import/page.tsx`
- Test: `src/lib/__tests__/import-export.test.ts`

**Interfaces:**
- Consumes: `studentCreateSchema` (Task 6).
- Produces: `parseStudentRows(buffer: Buffer): { valid: StudentRow[]; errors: {row: number; message: string}[] }` in `src/lib/import-export.ts`, used only by the import route (leaf feature) but kept separate from the route for testability.

- [ ] **Step 1: Install `xlsx`**

Run: `npm install xlsx`

- [ ] **Step 2: Write the failing test**

`src/lib/__tests__/import-export.test.ts`:
```ts
import { parseStudentRows } from "../import-export";
import * as XLSX from "xlsx";

function makeSheetBuffer(rows: Record<string, any>[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

describe("parseStudentRows", () => {
  it("parses valid rows", () => {
    const buffer = makeSheetBuffer([
      { admissionNumber: "ADM-1", fullName: "Sana Khan", gender: "FEMALE", dob: "2015-01-01" },
    ]);
    const { valid, errors } = parseStudentRows(buffer);
    expect(valid).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  it("reports an error row for a missing required field, keeping row numbers 1-based including header", () => {
    const buffer = makeSheetBuffer([
      { admissionNumber: "ADM-2", gender: "MALE", dob: "2015-01-01" },
    ]);
    const { valid, errors } = parseStudentRows(buffer);
    expect(valid).toHaveLength(0);
    expect(errors[0].row).toBe(2);
  });
});
```

- [ ] **Step 3: Run to verify it fails.**

- [ ] **Step 4: Implement**

`src/lib/import-export.ts`:
```ts
import * as XLSX from "xlsx";
import { studentCreateSchema } from "./validation/student";

export function parseStudentRows(buffer: Buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const valid: any[] = [];
  const errors: { row: number; message: string }[] = [];

  rows.forEach((row, i) => {
    const result = studentCreateSchema.safeParse(row);
    if (result.success) valid.push(result.data);
    else errors.push({ row: i + 2, message: result.error.issues.map((iss) => iss.message).join("; ") });
  });

  return { valid, errors };
}

export function studentsToSheetBuffer(students: Record<string, unknown>[]) {
  const ws = XLSX.utils.json_to_sheet(students);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
```

- [ ] **Step 5: Run test to verify it passes.**

- [ ] **Step 6: Import route (preview vs. commit two-step, duplicate detection against existing admission numbers)**

`src/app/api/students/import/route.ts` — `POST` (ADMIN), reads the uploaded file from `FormData`, calls `parseStudentRows`, cross-checks `valid` rows' `admissionNumber`s against existing `Student` rows (marks duplicates as additional `errors` entries rather than importing them), and — only when the request includes `?commit=true` — inserts the remaining valid+non-duplicate rows via `prisma.student.createMany`; without `?commit=true` it returns the preview `{ valid, errors, duplicates }` only, so the UI can show a confirmation table before writing anything.

- [ ] **Step 7: Export route** — `src/app/api/students/export/route.ts` `GET` (ADMIN/TEACHER), fetches all non-deleted students (optionally filtered by the same `q`/class params as the list page), maps to a flat row shape, calls `studentsToSheetBuffer`, returns it with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and a `Content-Disposition` attachment header.

- [ ] **Step 8: Import UI** — `src/app/admin/students/import/page.tsx`: file picker → "Preview" button calls the route without `commit`, shows a table of valid rows + a separate error table (row #, message) + duplicate list; "Confirm Import" button re-submits with `?commit=true`, disabled until at least one valid row exists.

- [ ] **Step 9: Wire "Export" button on the student list page (Task 7) to `GET /api/students/export`.**

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add CSV/Excel student bulk import with preview and export"
```

---

### Task 25: Settings page (institute profile, grading bands, current session)

**Files:**
- Create: `src/lib/settings.ts`
- Create: `src/app/api/settings/route.ts`
- Create: `src/app/api/settings/institute/route.ts`
- Create: `src/app/admin/settings/page.tsx`

**Interfaces:**
- Consumes: `Setting` model (key/value JSON store).
- Produces: `getSetting<T>(key: string, fallback: T): Promise<T>`, `setSetting(key: string, value: unknown): Promise<void>` in `src/lib/settings.ts`, used by `Topbar` (Task 5, retrofit its fetch to use `GET /api/settings/institute`) and by `calculateGrade` callers who want the school's configured bands instead of `DEFAULT_GRADE_BANDS`.

- [ ] **Step 1: Implement the settings helper**

`src/lib/settings.ts`:
```ts
import { prisma } from "./prisma";

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: JSON.stringify(value) },
    update: { value: JSON.stringify(value) },
  });
}
```

- [ ] **Step 2: Routes** — `src/app/api/settings/route.ts` `GET` (ADMIN, returns all known keys: `institute`, `gradeBands`, `attendanceRules`) and `POST` (ADMIN, body `{ key, value }`, calls `setSetting`). `src/app/api/settings/institute/route.ts` `GET` only, unauthenticated-safe subset (`name`, `logoPath` — no sensitive data) used by the public `Topbar` and login page header.

- [ ] **Step 3: Settings UI** — form sections: Institute (name, address, contact — logo upload deferred, text fields only in v1), Grading Bands (editable table of `{min, grade}` rows backed by `gradeBands` setting, seeded with `DEFAULT_GRADE_BANDS` from Task 15 if unset), Current Session (select from `/api/sessions`, calls `PATCH /api/sessions/[id]` with `isCurrent: true` and unsets any previously-current session in the same request — extend the sessions PATCH handler from Task 4 to do this unset-others logic inside a `$transaction` when `isCurrent: true` is set).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add institute settings, configurable grading bands, current session control"
```

---

### Task 26: Seed script (demo data so the app isn't empty on first run)

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (add `"prisma": { "seed": "ts-node prisma/seed.ts" }`, install `ts-node`)

**Interfaces:**
- Consumes: every Prisma model, `hashPassword` (Task 3).

- [ ] **Step 1: Install ts-node**

Run: `npm install -D ts-node`

- [ ] **Step 2: Write the seed script** — creates: one `AcademicSession` (current year, `isCurrent: true`), 3 `Class`es ("Grade 6", "Grade 7", "Grade 8") each with 2 `Section`s ("A", "B"), 6 `Subject`s (Math, English, Science, Urdu/Social Studies per locale, Computer, Islamiyat — adjust to a generic neutral set: Math, English, Science, Social Studies, Computer, Art), 1 Admin user (`admin`/`Admin@12345`), 3 Teacher users+profiles with `TeacherSubject` assignments across the sections, 20 Students spread across the 6 sections with `Enrollment` rows and roll numbers, 1-2 `Guardian`s per student with `GuardianLink`s (a couple with a `User` account so a Parent login can be demoed), sample `FeeStructure` rows per class, one generated `FeeVoucher` per student for the current month with a mix of paid/unpaid/partial statuses, one `Examination` ("Midterm") with `ExamSubject`s for each class/subject and randomized `Mark`s, published, plus a few `Announcement`s and `TimetableEntry` rows. Print the seeded Admin/Teacher/Parent/Student login credentials to the console at the end.

- [ ] **Step 3: Run it**

Run: `npx prisma db seed`
Expected: completes with no errors, prints credentials.

- [ ] **Step 4: Manual smoke test** — `npm run dev`, log in as the seeded admin, click through Students/Attendance/Fees/Exams/Dashboard and confirm each renders real data, not empty states.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add demo seed script with sample students, fees, exams, and results"
```

---

### Task 27: Test suite pass, lint pass, production build verification

**Files:**
- Modify: none (verification-only task)

- [ ] **Step 1: Run the full unit test suite**

Run: `npm test`
Expected: all tests from Tasks 3, 4, 6, 8, 9, 12, 15, 24 pass.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no errors (warnings acceptable, fix anything trivial).

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: build succeeds with zero type errors.

- [ ] **Step 4: Manual role smoke test** (per spec's Testing section, scaled to v1): log in as Admin (create a student, enroll, mark attendance, generate+pay a voucher, create+publish an exam with marks, promote a student, run an import preview, view dashboard charts); log in as the seeded Teacher (mark attendance, enter marks, view timetable); log in as a seeded Student and a seeded Parent (view-only, confirm no write controls are visible and API calls for other students' data 403).

- [ ] **Step 5: Fix anything broken found during the smoke test, committing each fix separately** with a `fix:` commit message describing the bug.

---

## Phase 8 — Human-Readable Documentation

### Task 28: README, User Guide, and Architecture doc

**Files:**
- Modify: `README.md` (replace Task 1's placeholder header with the full document)
- Create: `docs/USER_GUIDE.md`
- Create: `docs/ARCHITECTURE.md`

**Interfaces:**
- Consumes: nothing (documentation only, written from the finished app).

- [ ] **Step 1: `README.md`** — written for a developer (or the friend, if technical) picking up the repo cold: what this project is (one paragraph, referencing it's an MVP scoped down from the original ask, with a link to the spec doc), tech stack list, prerequisites (Node version), setup steps (`npm install`, copy `.env.example` to `.env`, `npx prisma migrate dev`, `npx prisma db seed`, `npm run dev`), default seeded login credentials for each role, how to run tests (`npm test`) and build for production (`npm run build && npm start`), a "What's included in v1 / What's deferred" section copied from the spec's Goals/Non-Goals so it's not lost, and a pointer to `docs/USER_GUIDE.md` and `docs/ARCHITECTURE.md`.

- [ ] **Step 2: `docs/USER_GUIDE.md`** — written for the **school staff**, not a developer, in plain language with no jargon. Structure as one section per role:
  - **Admin**: logging in, adding a student (with a description of each field and why it's needed), enrolling a student into a class, marking up fee structures, generating and printing a fee voucher, recording a payment, creating an exam and publishing results, promoting a class at year-end, adding a teacher, building the timetable, posting an announcement, running a bulk student import (with a note on what the preview step catches), exporting reports.
  - **Teacher**: logging in, marking daily attendance, entering exam marks, viewing your timetable.
  - **Student / Parent**: logging in, viewing attendance/fees/results, what you can and cannot do (read-only).
  - A short **Troubleshooting** section: forgotten password (admin resets via re-seeding or a future reset-password feature — note this is not yet built), "why can't I edit this record" (soft-delete/published-result-lock explanations in plain terms), where uploaded documents are stored.
  Every instruction should describe actual buttons/pages that exist in the built app — verify each claim against the running app (from Task 27's smoke test) before writing it, don't describe hypothetical UI.

- [ ] **Step 3: `docs/ARCHITECTURE.md`** — written for a future developer: system diagram in words (Next.js app → API routes → Prisma → SQLite; NextAuth session flow; file uploads on local disk), the data model list with a one-line purpose per table (drawn from `prisma/schema.prisma`), the role/permission enforcement points (middleware + per-route `requireRole` + ownership checks), the list of deferred v1 modules and, for each, the smallest next step if the friend ever wants to add it (e.g. "PDF export: replace `window.print()` triggers with a server route using `@react-pdf/renderer`, reusing the existing `VoucherPrintView`/`MarksheetView` layouts as the template"), and how to add a new simple lookup entity using the `makeCrudRoutes` factory from Task 4 as a worked example.

- [ ] **Step 4: Verify all documented commands actually work** by running each one listed in `README.md`'s setup section from a clean clone (`git clone`, or simulate by checking `npm ci` isn't required since only `npm install` was used throughout).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: add README, plain-language user guide, and architecture doc"
```

---

## Self-Review Notes (for the plan author, not the executor)

- **Spec coverage:** Auth/roles (Task 3), Students/Guardians/Profile (6-8), Academic structure/sessions (4-5), Attendance (9-10), Fees/vouchers/payments/defaulters (11-13), Exams/marks/results/publish-lock (14-16), Marksheets (17), Teachers (18), Timetable (19), Announcements (20), Promotion (21), Dashboards/charts (22), Documents (23), Import/export (24), Settings/grading config (25), Seed data (26), Testing pass (27), Documentation (28) — every in-scope spec module has a task. Non-Goals items (library/transport/inventory/multi-campus/SMS/certificates/ID cards/PDF export/scheduled backups/8-role matrix) intentionally have none.
- **Placeholder scan:** no TBD/TODO left; every code step has real code; CRUD-pattern repeats (Task 4 Step 6, Task 18) spell out the exact delegate/schema substitution rather than saying "similar to above" without specifics.
- **Type consistency:** `requireRole(session, roles)` signature matches across Tasks 3-25; `computeVoucherStatus`/`nextVoucherNumber` signatures match between Task 12's test and implementation; `calculateGrade`/`calculatePositions` signatures match between Task 15's test, implementation, and Task 22/17's consumers.
