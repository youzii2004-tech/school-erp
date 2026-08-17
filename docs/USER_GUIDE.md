# School ERP — User Guide

This guide is for school staff using the system day to day — no technical background
needed. If you're a developer looking for how the system is built, see
[`ARCHITECTURE.md`](ARCHITECTURE.md) instead.

Every screen and button named below exists in the running app as described — this guide
was written by reading the actual page code, not by guessing what "should" be there.
Where the app's left-hand menu doesn't yet have a working link to a page described here
(see the note in Troubleshooting), the guide tells you the web address to type instead.

---

## Logging in

1. Open the site in your browser. You'll land on a **Login** page with the school name at
   the top and two fields: **Username** and **Password**.
2. Enter your username and password (given to you by whoever administers the system) and
   click **Login**.
3. You'll be taken straight to your dashboard — Admin, Teacher, Student, and Parent each
   see a different one, and the menu on the left changes to match your role.
4. To sign out, use the sign-out control in the top bar.

---

## Admin

The Admin account has full access: students, classes, fees, exams, teachers, timetable,
announcements, reports, and settings.

### Adding a student

1. Go to **Students** in the left menu.
2. Click **Add Student**.
3. Fill in the form:
   - **Admission Number** — the school's own unique ID for this student (e.g.
     `ADM-1001`). Required, and must be unique — the system will reject a duplicate.
   - **Full Name** — required.
   - **Gender** — Male / Female / Other.
   - **Date of Birth** — required.
   - **CNIC / B-Form Number** — optional, the student's national ID number if they have
     one.
   - **Blood Group** — optional, useful for emergencies.
   - **Phone** — optional contact number.
   - **Address** — optional.
   - **Previous School** — optional, if the student transferred in.
4. Click **Add Student** to save. The student now appears in the Students list, but is
   **not yet in a class** — that's a separate step (below), because admission and class
   placement are two different decisions (a student can be admitted before the school
   year's classes are finalized).

### Enrolling a student into a class

1. Open the student's profile (click their row in the Students list).
2. On the **Overview** tab, click **Enroll Student**.
3. Choose the academic session, class, section, and roll number, then confirm.
4. This creates the student's official enrollment record for that session. A student can
   only have one active enrollment per academic session — the system will stop you if you
   try to create a second one for the same session.

### Setting up fee structures

1. Go to the address `/admin/fees/structures` (see the note on menu links in
   Troubleshooting).
2. Add a fee category for a class — for example "Tuition", Rs. 5,000, Monthly, for
   Grade 6. Each class can have several categories (Tuition, Computer, Exam fee, etc.),
   each with its own amount and how often it's charged (Monthly, Annual, or One-Time).
3. These structures are what the system pulls from automatically when you generate a fee
   voucher for a student in that class — you don't re-type amounts every month.

### Generating and printing a fee voucher

1. Go to the address `/admin/fees/vouchers`.
2. Click **Generate Voucher**.
3. Search for the student by name or admission number and select them.
4. The charges are pulled in automatically from that student's class fee structure — you
   don't need to enter amounts by hand. Confirm to create the voucher.
5. Open the voucher from the list to see the full on-screen printable view (voucher
   number, breakdown, due date, balance). Use the **Print** button on that page to print
   it via your browser's print dialog — there's no separate PDF file generated in this
   version.

### Recording a payment

1. Open the fee voucher (from the vouchers list, or from the student's profile under
   their fee history).
2. Click **Record Payment**.
3. Enter the amount, choose a payment method (Cash, Bank Transfer, Online, or Cheque),
   and an optional reference number (e.g. a bank transaction ID).
4. The voucher's paid amount and status (Unpaid / Partially Paid / Paid) update
   automatically.

### Creating an exam and publishing results

1. Go to **Examinations** — from the address `/admin/exams` (see Troubleshooting note).
2. Click **Create Exam** and give it a name (e.g. "Midterm 2026"), a type (Midterm, Final,
   Monthly, Quiz, or Class Test), and pick the academic session it belongs to.
3. Open the exam and click **Add Subject** for each subject/class combination you want to
   examine — set the total marks and passing marks for each.
4. Marks are then entered either by you (Admin) or by the assigned teacher, on a
   per-subject, per-student basis.
5. Once all marks are in, go to the exam and click **Publish Results**. A confirmation
   dialog will warn you: *"This makes marks for this exam visible to students and
   parents. This action cannot be undone."* Once published, marks for that exam can no
   longer be edited by anyone — this is intentional (see Troubleshooting, "why can't I
   edit this").
6. The **Results** view for a published exam shows the whole class's marks, totals,
   grades, and rank/position side by side (the "gazette" view).

### Promoting a class at year-end

1. Go to the address `/admin/promotions`.
2. Choose the **From** class and section (which students you're moving) and the **To**
   class, section, and academic session (where they're going).
3. Select the students to promote and confirm. Each promoted student gets a new
   enrollment in the target class/session, and their old enrollment is marked
   "Promoted" — it's never deleted, so you can always see a student's full class
   history on their profile.

### Adding a teacher

1. Go to **Teachers** in the left menu.
2. Click **Add Teacher** and fill in their name, qualification, joining date,
   designation, and phone number. This also creates their login account.
3. Open the teacher's profile to assign them to specific subject/class/section
   combinations — this controls what shows up on their own dashboard and what they're
   allowed to mark attendance or enter grades for.

### Building the timetable

1. Go to **Timetable** in the left menu.
2. It's a simple grid: for each section, add entries by day, time slot, subject, teacher,
   and (optionally) room. There's no automatic clash detection in this version — if you
   double-book a teacher or room, the system won't warn you, so it's worth checking by
   eye.

### Posting an announcement

1. Go to **Announcements** in the left menu.
2. Click **New Announcement**, give it a title and body, and choose the audience: all
   users, a specific role (e.g. only parents), or a specific class/section.
3. It immediately appears in the announcements feed on the relevant dashboards.

### Running a bulk student import

1. Go to **Students**, then click **Import**.
2. Upload a CSV or Excel file with columns: `admissionNumber`, `fullName`, `gender`
   (MALE/FEMALE/OTHER), `dob`, and optionally `cnicOrBForm`, `bloodGroup`, `phone`,
   `address`, `previousSchool`.
3. Click **Preview**. **Nothing is saved yet at this point.** The preview screen shows
   three things:
   - **Valid rows** — exactly what will be created if you confirm.
   - **Errors** — rows the system couldn't parse (e.g. a missing required field or a bad
     date), with the row number and what's wrong, so you can fix your file and re-upload.
   - **Duplicates** — rows skipped because the admission number either repeats within
     your file or already exists in the system, with the reason shown for each.
4. Once you're satisfied, click **Confirm Import** to actually create the valid rows.
   Errors and duplicates are never imported — only the "valid rows" set is written.

### Exporting reports

- From the **Students** page, click **Export** to download the current student list as a
  CSV file (this respects any name/admission-number search filter you've applied).
- From the fee **Defaulters** page (`/admin/fees/defaulters`), you can see every student
  with an outstanding or overdue balance — this doubles as your day-to-day collections
  report; there isn't a separate dedicated "Reports" page in this version (see
  Troubleshooting).

---

## Teacher

Teachers see a smaller menu: Dashboard, Attendance, Marks Entry, and Timetable.

### Logging in

Same as above — use your teacher username and password.

### Marking daily attendance

1. Go to **Attendance**.
2. Choose the section you're marking (only your assigned sections are relevant), and the
   date.
3. For each student, mark Present, Absent, Late, or Leave, with an optional remark, then
   save. You can only mark attendance for sections you're actually assigned to teach.

### Entering exam marks

1. Go to **Marks Entry**.
2. Choose the exam and subject you've been assigned to.
3. Enter each student's obtained marks against the total for that subject.
4. If the exam has already been published by the Admin, you will not be able to change
   marks for it anymore — the fields lock once results go live.

### Viewing your timetable

Go to **Timetable** to see your own weekly schedule — day, time, subject, class/section,
and room, generated from whatever the Admin has set up for you.

---

## Student / Parent

Both roles are **read-only** — there is nothing to edit here, only to view.

### Logging in

Same login screen as everyone else, with the student's or parent's own username and
password.

### What you see

Both Student and Parent land on a single **Dashboard** page that shows everything at a
glance:

- **Attendance this month** — your (or your child's) attendance percentage.
- **Latest Result** — the most recent published exam's percentage and grade. If no exam
  has been published yet, this simply says so.
- **Fee Voucher Status** — the current voucher's status (Unpaid / Partially Paid / Paid)
  and how much has been paid against the total due.
- **Announcements** — anything posted for "everyone," your role, or your class.

If you're a **Parent** linked to more than one child, a dropdown at the top of the
dashboard lets you switch between them — the whole page updates to that child's data.

### What you can and cannot do

- You can view your own (or your linked child's) attendance, results, and fee status.
- You **cannot** edit any of your own records, mark attendance, enter marks, or see any
  other student's data — every one of those actions is blocked by the system, not just
  hidden from the menu.
- A Parent can only see children they're actually linked to as a guardian; trying to view
  an unrelated student's record is rejected.

---

## Troubleshooting

**"I clicked a link in the left menu and got a blank/error page."**
A few of the left-menu links point to pages that weren't built as separate URLs — the
underlying feature exists and works, it's just not wired into that particular menu item
yet. Specifically: for **Admin**, the *Attendance*, *Fees*, *Examinations*, and *Reports*
menu items don't currently lead anywhere — use the direct addresses given in this guide
instead (`/admin/fees/structures`, `/admin/fees/vouchers`, `/admin/fees/defaulters`,
`/admin/exams`, `/admin/promotions`). For **Teacher**, *My Classes* and *Announcements*
aren't wired up (attendance and marks entry both work fine from their own menu items).
For **Student** and **Parent**, everything lives on the single Dashboard page described
above — the other menu items (Attendance, Fees, Results, Timetable, Announcements as
separate pages) aren't built as separate screens in this version. This is a known gap in
the navigation menu, not missing functionality — worth a quick fix if this system keeps
being used (see `ARCHITECTURE.md`).

**"I forgot my password."**
There's no self-service password reset in this version. The Admin can give you a new
login by re-running the demo seed script (which resets *all* accounts — only appropriate
during setup/testing, not for a live school with real data) or, for a real fix, ask
whoever maintains the code to add a proper "reset password" feature — it hasn't been
built yet.

**"Why can't I edit this record?"**
Two situations cause this on purpose:
- **It's been "soft deleted."** Deleting a student, fee record, or exam/mark record in
  this system never actually erases it from the database — it's marked as deleted and
  hidden from lists, but the history is kept. This protects against accidental data loss.
- **The exam has been published.** Once an Admin clicks **Publish Results** on an exam,
  every mark tied to that exam becomes permanently read-only for everyone, including
  Admin. This is deliberate — it stops results from silently changing after students and
  parents have already seen them. If a genuine correction is needed after publishing,
  there's no "unpublish" button in this version; that would need a direct database fix.

**"Where are uploaded documents (student photos, certificates, etc.) stored?"**
They're saved as plain files on the server's local disk, under an `uploads/` folder (for
example, a student's uploaded documents live under
`uploads/students/<student's internal ID>/`), with a matching row in the database
recording the file's type and location. There's no cloud storage involved — if you move
the app to a new server, remember to copy the `uploads/` folder along with the database
file, or uploaded photos/documents will appear to have "disappeared" (the records will
still exist, just pointing at files that no longer exist on the new machine).
