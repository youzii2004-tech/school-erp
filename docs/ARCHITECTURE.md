# School ERP — Architecture

For a future developer picking this repo up cold. For "what does the app do and how do I
use it," see [`USER_GUIDE.md`](USER_GUIDE.md); for setup/run commands, see the root
[`README.md`](../README.md).

---

## System overview

```
 Browser
   │  HTTPS
   ▼
 Next.js 16 (App Router) — one process
   ├─ Pages (React Server/Client Components under src/app/<role>/**)
   │     fetch client-side from...
   ├─ API routes (src/app/api/**/route.ts) — the entire backend
   │     │  every protected route: getServerSession(authOptions) → requireRole(...)
   │     ▼
   ├─ NextAuth (src/lib/auth.ts) — Credentials provider, JWT session strategy
   │     validates against...
   │     ▼
   ├─ Prisma Client (src/lib/prisma.ts, a singleton) — src/lib/prisma.ts
   │     ▼
   └─ SQLite file (prisma/dev.db)

 Local disk: uploads/ (student photos/documents), served back through
 src/app/api/uploads/[...path]/route.ts (a protected route, not a static file mount).
```

There is no separate backend service — every API route under `src/app/api/**` runs in
the same Next.js process as the pages that call it, and every one of them talks to
SQLite through the single Prisma client. This is intentional: the entire point of the
architecture (see the spec's Goals) is "single Next.js process + SQLite file," cheap to
run and easy for a non-technical friend to self-host.

### Auth / session flow

1. User submits username + password on `/login` (`src/app/(auth)/login/page.tsx`), via
   NextAuth's `signIn("credentials", ...)`.
2. NextAuth's `authorize()` callback (`src/lib/auth.ts`) looks the user up by `username`,
   verifies the bcrypt hash with `verifyPassword`, and rejects inactive accounts.
3. On success, the `jwt` callback stamps `token.id` and `token.role` onto the JWT; the
   `session` callback copies both onto `session.user`. (This `id` propagation was a real
   bug found and fixed during Task 27's HTTP smoke test — see that task's report; every
   "look up my own record" and "who did this" audit field depends on it.)
4. `src/middleware.ts` runs on every request under `/admin/:path*`, `/teacher/:path*`,
   `/student/:path*`, `/parent/:path*`: it requires a valid session token at all, and
   additionally redirects a signed-in user away from another role's area if they land on
   one (e.g. a STUDENT hitting `/admin/...` gets bounced to `/student`).
5. Individual API routes re-check role (and, where relevant, record ownership) themselves
   — middleware only gates the page shell, not the data. See "Permission enforcement"
   below.

### File uploads

`POST /api/upload` (student documents/photos) writes directly to
`uploads/students/<studentId>/<randomUUID>.<ext>` on local disk via Node's `fs/promises`,
and records a `Document` row (`studentId`, `type`, `filePath`) pointing at the relative
path. Reads go through `src/app/api/uploads/[...path]/route.ts` — a protected route that
serves the file back, not a public static mount, so document access still goes through
the session check. There is no cloud storage integration; moving the app to a new host
means copying both `prisma/dev.db` and the `uploads/` directory.

---

## Data model

Source of truth: `prisma/schema.prisma`. One line per table:

| Model | Purpose |
|---|---|
| `User` | Login identity — username/email/password hash/role. 1:1 with `Student` or `Teacher` where applicable; also the target of a `GuardianLink.userId` for Parent portal logins. |
| `AcademicSession` | A school year (e.g. "2026-2027"); scopes classes, enrollments, exams, and fee vouchers so historical data is never overwritten. Soft-deletable. |
| `Class` | A grade level (e.g. "Grade 6") within one session. |
| `Section` | A subdivision of a class (e.g. "A" / "B"). |
| `Subject` | A teachable subject, referenced by exams, timetable entries, and teacher assignments. |
| `Student` | Core student profile (admission number, name, DOB, CNIC/B-Form, contact info). Optionally linked to a `User` for Student-portal login. |
| `Guardian` | A parent/guardian's own contact details, independent of any login. |
| `GuardianLink` | Many-to-many join between `Student` and `Guardian`; carries the optional `userId` that grants that guardian a Parent-portal login scoped to their linked children. |
| `Enrollment` | A student's placement into one class/section/roll-number for one academic session. Unique per (student, session) — enforces "one active enrollment per session." |
| `PromotionHistory` | A record of a student moving from one class/session to another; never overwrites the old `Enrollment`, just marks it superseded. |
| `TransferHistory` | A record of a student transferring in or out of the school. |
| `Attendance` | One row per (student, date): Present/Absent/Late/Leave, who marked it. |
| `FeeStructure` | A recurring or one-time charge category (Tuition, Exam, etc.) tied to a class — the template vouchers are generated from. |
| `FeeVoucher` | A billing document for one student for one billing period: breakdown, discount/fine, total payable, paid amount, computed status. |
| `FeePayment` | A single payment applied against a voucher (amount, method, reference). |
| `Examination` | A named exam (Midterm, Final, ...) scoped to a session; `publishedAt` is the publish-lock. |
| `ExamSubject` | One subject's configuration (total/passing marks, exam date) within one exam, for one class. |
| `Mark` | One student's obtained marks for one `ExamSubject`. |
| `Teacher` | Teacher profile, 1:1 with a `User`. |
| `TeacherSubject` | A teacher's assignment to teach one subject to one class/section — drives both attendance/marks-entry authorization and dashboard scoping. |
| `TimetableEntry` | One grid cell: section + subject + teacher + day/time/room. |
| `Announcement` | A posted message with an audience (`ALL`, `ROLE:<role>`, `CLASS:<id>`, `SECTION:<id>`). |
| `Document` | Metadata for one uploaded file (type, path) tied to a student. |
| `Setting` | A generic key/value store (JSON-encoded value) — institute profile, grading bands, current-session pointer all live here. |

---

## Permission enforcement points

Three layers, all real, none decorative:

1. **`src/middleware.ts`** — page-shell gate. Requires *any* valid session for
   `/admin|/teacher|/student|/parent/*`, and redirects a role away from another role's
   area. This alone does **not** protect API data — a signed-in Teacher hitting an
   admin-only API route would still be rejected at layer 2, not layer 1.
2. **Per-route `requireRole(session, roles)`** (`src/lib/auth.ts`) — every one of the 37
   `getServerSession(authOptions)` call sites across `src/app/api/**` calls this before
   doing anything role-sensitive (list vs. write, which roles may POST/PATCH/DELETE). The
   generic `makeCrudRoutes`/`makeCrudItemRoutes` factory (`src/lib/api/crud-factory.ts`)
   bakes this in via each call's `writeRoles` option so individual lookup-entity routes
   don't have to repeat it.
3. **Per-record ownership checks** — for STUDENT and PARENT, role alone isn't enough
   (a Student must only see *their own* record; a Parent only *their linked children's*).
   These checks are inline in the relevant route handlers, not in a shared helper, e.g.
   `GET /api/students/[id]` (`src/app/api/students/[id]/route.ts`) checks
   `student.userId !== session.user.id` for STUDENT and does a `GuardianLink.findFirst`
   lookup for PARENT before returning data; `GET /api/fee-vouchers` does the equivalent
   scoping by branching on `session.user.role === "STUDENT" | "PARENT"` before querying.
   This pattern repeats per-route (fee vouchers, exams/results, attendance, timetable)
   rather than being centralized — worth factoring into a shared `scopeToOwnRecords()`
   helper if this grows further, but it is currently correct everywhere Task 27's HTTP
   smoke test exercised it (29/29 scenarios, including explicit self-vs-other 403 checks
   for both STUDENT and PARENT).

Soft delete is enforced the same way everywhere: every list/detail query filters
`deletedAt: null`, and `DELETE` handlers do `update({ data: { deletedAt: new Date() } })`
instead of an actual delete — there is no code path in the UI that issues a hard delete
for `Student`, `FeeVoucher`, `FeePayment`, `Examination`, `ExamSubject`, or `Mark`.

The exam publish-lock is enforced at the API layer, not just the UI: once
`Examination.publishedAt` is set, `POST/PATCH /api/marks` for that exam's marks rejects
further writes regardless of role — Admin included.

---

## Resolved: sidebar navigation vs. actual routes

`src/components/layout/Sidebar.tsx` originally shipped (Task 5) with placeholder `href`s
for pages that didn't exist yet, and was never updated as later tasks built the real
pages at different paths. This was caught by Task 28's documentation review (verifying
every UI claim against real source surfaced the mismatch) and fixed directly:
Admin's *Fees* is now a submenu pointing at the three real fee pages
(`/admin/fees/structures`, `/admin/fees/vouchers`, `/admin/fees/defaulters`),
*Examinations* points at `/admin/exams`, a *Promotions* entry was added
(`/admin/promotions`), and *Attendance*/*Reports* were removed (no such Admin-facing
pages exist — attendance marking is Teacher-only, and CSV export lives on the Students
page). Teacher's *My Classes*/*Announcements* and Student/Parent's every-item-but-Dashboard
were removed since that content was consolidated onto a single dashboard page per role
(Task 22) and was never built as separate routes. Every remaining `href` in `NAV` is
verified against a real `page.tsx`. See the SDD ledger's Task 28 entry for the full
before/after link table.

---

## Deferred v1 modules — smallest next step for each

Straight from the spec's Non-Goals; for each, here's the smallest concrete way to add it
later without a redesign:

- **Library / Transport / Inventory management** — each is a new, mostly independent
  module: one Prisma model per entity (e.g. `Book`, `BookLoan`), a `makeCrudRoutes` API
  (see the worked example below), and its own admin section. No existing table needs to
  change to add these.
- **Multi-campus support** — add a `Campus` model, put `campusId` on `Class` (and
  cascade it down through `Section`/`Enrollment` as needed), and add a campus filter to
  the relevant list queries and to the session's role/permission scoping. Bigger than the
  others because it touches an existing hot path (`Class`), not a new isolated table.
- **SMS/email sending** — the architecture already leaves a clean seam: `Announcement`
  creation and fee-voucher generation are the two natural trigger points. Add a
  `sendNotification(userId, message)` function behind a provider interface (e.g. Twilio
  for SMS, a transactional-email API), call it from those two write paths, and gate it
  behind a Settings toggle so it's opt-in.
- **Certificate generation + public verification page, student ID cards** — both are
  "generate a printable/scannable document from existing data" problems, same shape as
  the PDF-export item below: build a template component, then either print it via
  `window.print()` (matching the current voucher/marksheet pattern) or route it through a
  server-side renderer once that exists. Public verification would need one new
  unauthenticated API route (`GET /api/verify/[certificateId]`) plus a `Certificate`
  model with a random, unguessable ID.
- **Real PDF export** — replace the `window.print()` triggers with a server route using
  `@react-pdf/renderer`, reusing the existing `VoucherPrintView`
  (`src/components/fees/VoucherPrintView.tsx`) and `MarksheetView`
  (`src/components/exams/MarksheetView.tsx`) components as the layout template (both
  names confirmed against the actual component files). Concretely: add
  `src/app/api/fee-vouchers/[id]/pdf/route.ts` that fetches the same voucher data the
  print page already fetches, renders it through a `@react-pdf/renderer` version of
  `VoucherPrintView`'s layout, and returns it with a `Content-Type: application/pdf`
  header; same pattern for marksheets.
- **Scheduled/automated backups** — smallest version is a cron job (or Windows Task
  Scheduler entry, since this runs on Windows) that copies `prisma/dev.db` to a
  timestamped file on a schedule; no code change needed. A more integrated version would
  add an Admin-only `POST /api/backup` route that does the same copy on demand.
- **Full 8-role permission matrix** — the current 4-role `Role` enum
  (`ADMIN | TEACHER | STUDENT | PARENT`) would need Super Admin/Accountant/Exam
  Officer/Reception split back out. Because `requireRole` already takes an array of
  allowed roles per route, the mechanical part is adding enum values and updating each
  route's `writeRoles`/`requireRole` call to the new, narrower set — the risk is entirely
  in deciding the correct permission split per route, not in the plumbing.
- **Full granular audit log** — add an `AuditLog` model (`userId`, `action`, `entity`,
  `entityId`, `before`/`after` JSON, `createdAt`) and a single `logAudit(...)` helper
  called from each write route, or centralize it inside `makeCrudRoutes`/
  `makeCrudItemRoutes` so every factory-based route gets it for free. The non-factory
  routes (students, fees, exams, marks) would need the call added individually.

---

## Worked example: adding a new simple lookup entity with `makeCrudRoutes`

This walks through adding a hypothetical new lookup table — say, `Designation` (a
teacher's job title as a proper managed list instead of a free-text field) — the same way
`Subject` was built (`src/app/api/subjects/route.ts` / `[id]/route.ts`), which is the real
existing usage this pattern is copied from.

**1. Add the Prisma model** (`prisma/schema.prisma`):

```prisma
model Designation {
  id        String    @id @default(cuid())
  name      String    @unique
  deletedAt DateTime?
}
```

Then run `npx prisma migrate dev --name add_designation`.

**2. Add a Zod schema** (e.g. in `src/lib/validation/academic.ts`, alongside
`subjectSchema`):

```ts
export const designationSchema = z.object({
  name: z.string().min(1),
});
```

**3. Wire the collection route** (`src/app/api/designations/route.ts`) — this is the
entire file, matching `src/app/api/subjects/route.ts` exactly:

```ts
import { prisma } from "@/lib/prisma";
import { makeCrudRoutes } from "@/lib/api/crud-factory";
import { designationSchema } from "@/lib/validation/academic";

export const { GET, POST } = makeCrudRoutes(prisma.designation, designationSchema, {
  writeRoles: ["ADMIN"],
});
```

**4. Wire the item route** (`src/app/api/designations/[id]/route.ts`), matching
`src/app/api/subjects/[id]/route.ts`:

```ts
import { prisma } from "@/lib/prisma";
import { makeCrudItemRoutes } from "@/lib/api/crud-factory";
import { designationSchema } from "@/lib/validation/academic";

export const { PATCH, DELETE } = makeCrudItemRoutes(prisma.designation, designationSchema.partial(), {
  writeRoles: ["ADMIN"],
});
```

That's the whole backend: `makeCrudRoutes(delegate, schema, opts)` gives you
`GET` (lists all non-soft-deleted rows, any signed-in user) and `POST` (creates one,
restricted to `opts.writeRoles`); `makeCrudItemRoutes` gives you `PATCH` (partial update)
and `DELETE` (soft delete — sets `deletedAt`, never a real row deletion), both also
gated by `opts.writeRoles`. Every request is validated through `validateOrThrow(schema,
body)` before touching Prisma, and a failed validation returns a 400 with the Zod error
detail rather than a raw exception.

**5. Add the admin page**, following the same pattern as
`src/app/admin/academic/subjects/page.tsx`: an `EntityFormDialog` (title "Add
Designation", `postUrl: "/api/designations"`, one text field) plus an `EntityTable`
pointed at `fetchUrl: "/api/designations"`. No new generic UI code needed — both
components already exist and are reused as-is.

This is the whole reusable path — 1 model + 1 migration + 1 schema + 2 route files (4
lines of actual logic between them) + 1 admin page reusing existing components. It's the
same shape used for `AcademicSession`, `Class`, `Section`, and `Subject`.
