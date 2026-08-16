# School Management ERP — MVP Design

Date: 2026-08-16
Status: Approved for implementation planning

## Context

A friend (non-paying, favor project) sent a master requirement document
(`Student_Management_Portal_Master_Prompt.docx`) describing a full commercial-grade
School/Institute ERP for a school of 300-500 students. The document specifies ~25
modules (student management, attendance, fees, exams, marksheets, library, transport,
inventory, multi-campus, SMS/email, certificate verification, ID cards, audit logs,
backup/restore, 8 distinct user roles, etc.) — effectively a multi-month commercial
product spec.

Since this is unpaid work and must not consume excessive resources, the goal is a
**scoped MVP core** that is fully functional and genuinely good-looking on the
frontend (must not look like a generic CRUD scaffold), while explicitly deferring
modules that add complexity without being core to daily school operations.

## Goals

- A real, usable school ERP core: students, classes, attendance, fees, exams/results,
  teacher management, basic timetable, announcements, dashboards.
- Frontend quality is the priority — sidebar-nav commercial-ERP feel, real charts,
  consistent design system, proper empty/loading/error states.
- Cheap to build (Haiku-subagent swarm, Sonnet verifies) and cheap to run (single
  process, file-based DB, no external services required).
- Easy for the friend to self-host (single Next.js process + SQLite file).

## Non-Goals (explicitly deferred, not built in v1)

- Library management, Transport management, Inventory/asset management.
- Multi-campus support.
- SMS/email sending integration (architecture may leave a clean extension point, but
  no provider integration, no actual sending).
- Certificate generation + public verification page, student ID card generation.
- Real PDF export (vouchers/marksheets/report cards are viewable on-screen only in v1).
- Scheduled/automated backups (manual DB file copy is sufficient at this scale).
- Full 8-role permission matrix (Super Admin/Accountant/Exam Officer/Reception are
  merged into a single Admin role for v1).
- Full granular audit log of every event — v1 only guarantees soft-delete (no hard
  deletes of student/fee/exam records) and basic created/updated timestamps.

If the friend wants any deferred module later, it can be added as its own follow-up
spec once the core is live and reviewed — do not build it speculatively now.

## Roles (v1)

1. **Admin** — full access: students, classes, sessions, fees, exams, teachers,
   announcements, reports. Merges Super Admin/Accountant/Exam Officer/Reception.
2. **Teacher** — assigned classes/subjects only: mark attendance, enter marks,
   view own timetable, post announcements to own classes.
3. **Student** — read-only: own profile, attendance, fee status, results,
   marksheet (on-screen), timetable, announcements.
4. **Parent** — read-only: same as Student, scoped to linked children (a parent
   can be linked to multiple students).

Enforced at both UI (route guards) and API (middleware) level.

## Core Modules (v1)

- **Auth** — credentials login (email/username + password), bcrypt hashing,
  session-based via NextAuth, role stored on session.
- **Students & Guardians** — full profile fields per spec doc (ID, admission number,
  name, DOB, CNIC/B-Form, contacts, address, photo, campus/session/class/section/roll
  number, status), guardian linkage, document upload (stored as files on disk +
  metadata row, no cloud storage integration).
- **Classes / Sections / Subjects / Academic Sessions** — CRUD, session-scoped so
  historical data is never overwritten; a student has one active enrollment per
  session (enforced via unique constraint).
- **Promotion / Transfer history** — recorded as rows, viewable on student profile,
  not a full workflow engine.
- **Attendance** — daily, Present/Absent/Late/Leave, per class/section, monthly
  percentage view, absentee list, Excel export (no PDF in v1).
- **Fees** — fee structures per class, fee vouchers (on-screen, generate/search/
  reprint/mark-paid), payments (cash/bank/online/cheque with reference), balance
  tracking, defaulter list, collection reports (daily/monthly/class-wise/student-wise).
- **Examinations & Results** — create exam (type, classes, subjects, total/passing
  marks, dates), marks entry, auto-calculated total/percentage/grade/pass-fail/
  position, publish-and-lock (published results become read-only), class result
  sheet / gazette / position list views.
- **Marksheet / Report Card** — on-screen generated view (student photo, subject
  marks, totals, grade, position, attendance %, remarks, promotion status); real PDF
  export deferred.
- **Teacher management** — profile, assigned classes/subjects, teacher dashboard
  (own classes, attendance shortcuts, marks entry, timetable, announcements).
- **Timetable** — class/teacher/room timetable, simple grid CRUD, no auto-conflict
  solver.
- **Announcements** — targeted to all/class/section/role, visible on relevant
  dashboards.
- **Dashboards** — role-specific: Admin (school-wide stats + charts), Teacher (own
  classes), Student/Parent (own/linked child summary).
- **Import/Export** — CSV/Excel student bulk import with duplicate detection,
  preview, error report; export filtered student/attendance/fee lists to CSV/Excel.
- **Soft delete** — students, fee records, exam/mark records use a `deletedAt`
  column; never hard-deleted via the UI.

## Architecture

- **Framework:** Next.js 14 (App Router), TypeScript, single deployable process.
- **Styling:** Tailwind CSS + shadcn/ui component primitives, one consistent design
  token set (colors, radii, spacing) defined once and reused — this is where the
  "looks like effort was made" requirement is met.
- **Data:** Prisma ORM against a single SQLite file (`prisma/dev.db` locally,
  swappable to a real file path in production). No separate DB server to provision.
- **Auth:** NextAuth.js, Credentials provider, bcrypt password hashing, JWT session
  strategy, role embedded in the session token, middleware-based route protection
  per role.
- **Charts:** Recharts for dashboard visualizations (attendance trend, fee
  collection, result distribution).
- **File uploads:** stored under a local `uploads/` directory (student photos,
  documents), served via a protected Next.js route — no S3/cloud dependency for v1.
- **Validation:** Zod schemas shared between forms and API route handlers.

## Data Model (high level)

`users` (role, credentials) → `students` / `teachers` (1:1 with a user account) ·
`guardians` (many-to-many with `students`) · `academic_sessions` · `classes` ·
`sections` · `subjects` · `enrollments` (student+session+class+section, unique per
session) · `attendance` (per student/date/status) · `fee_structures` ·
`fee_vouchers` · `fee_payments` · `examinations` · `exam_subjects` · `marks` ·
`promotion_history` · `transfer_history` · `announcements` · `documents` ·
`timetable_entries` · `settings` (institute name/logo/grading scale/etc).

This is a trimmed version of the full doc's entity list — library/transport/
inventory/certificates/backups/notifications-as-a-service entities are omitted
per Non-Goals.

## Error Handling & Data Integrity

- Zod validation at API boundary, professional user-facing error messages (never
  raw stack traces / DB errors surfaced to the client).
- Prisma transactions for multi-row writes (e.g. payment + voucher balance update).
- Soft delete (`deletedAt`) on student/fee/exam-critical tables; hard deletes never
  exposed through the UI for those tables.
- Unique constraints: admission number, voucher number, one active enrollment per
  student per session.

## Testing

- Not full TDD given project size/budget, but each vertical slice (e.g. fee voucher
  generation, result calculation) gets a focused test for its core business logic
  (grade calculation, balance math, position ranking) before being marked done.
- Manual smoke test per role (Admin/Teacher/Student/Parent) covering the golden
  path listed in the source doc's Testing section, scaled to v1 scope.

## Build Method

1. This spec → implementation plan (writing-plans skill).
2. Plan broken into small, independently-verifiable tasks (one Prisma model +
   migration, one API route, one page/component) sized for Haiku subagents.
3. Sonnet (orchestrator) reviews each completed batch — schema correctness, route
   correctness, UI matches design tokens — before dispatching the next batch.
4. Frontend polish pass at the end scoped to each role's dashboard, since visual
   quality was explicitly requested as the priority.

## Open Questions / Risks

- Grading scale (percentage-only vs GPA) — default to percentage + letter grade
  band, configurable in Settings; GPA calc can be added later if the friend's school
  actually uses GPA.
- Seed data: plan includes a seed script (sample classes/sections/a few students/
  teachers) so the app is demoable immediately after setup, not empty.
