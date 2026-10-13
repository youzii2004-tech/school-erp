/**
 * Demo seed script — populates the SQLite dev database with a believable set
 * of sample data so the app isn't empty on first run.
 *
 * Idempotent: wipes all seed-owned tables first (dev-only local SQLite DB),
 * so `npx prisma db seed` can be re-run safely any number of times.
 *
 * Run: npx prisma db seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Inlined rather than imported from src/lib/{auth,fee-calc}.ts: this script
// runs standalone via ts-node under `npx prisma db seed`, and cross-importing
// from src/ hits ESM/CJS module-resolution friction with ts-node on newer
// Node versions (extensionless imports fail to resolve). Logic below is kept
// identical to src/lib/auth.ts#hashPassword and src/lib/fee-calc.ts.
async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

function computeVoucherStatus(totalPayable: number, paidAmount: number) {
  if (paidAmount >= totalPayable) return "PAID" as const;
  if (paidAmount > 0) return "PARTIALLY_PAID" as const;
  return "UNPAID" as const;
}

function nextVoucherNumber(lastNumber: string | null): string {
  if (!lastNumber) return "VCH-000001";
  const n = parseInt(lastNumber.split("-")[1], 10) + 1;
  return `VCH-${String(n).padStart(6, "0")}`;
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)];
}

const FIRST_NAMES_M = [
  "Ali", "Ahmed", "Bilal", "Danish", "Faisal", "Hamza", "Imran", "Junaid",
  "Kashif", "Owais",
];
const FIRST_NAMES_F = [
  "Ayesha", "Bushra", "Fatima", "Hina", "Iqra", "Javeria", "Kiran", "Laiba",
  "Mahnoor", "Sana",
];
const LAST_NAMES = [
  "Khan", "Malik", "Siddiqui", "Raza", "Sheikh", "Iqbal", "Farooq", "Abbasi",
  "Qureshi", "Chaudhry",
];

import { randomBytes } from "crypto";

// Demo passwords are public (README). Override per role via env, or generate
// random ones with SEED_RANDOM_PASSWORDS=1.
function seedPassword(role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT", fallback: string) {
  const fromEnv = process.env[`SEED_PASSWORD_${role}`];
  if (fromEnv) return fromEnv;
  if (process.env.SEED_RANDOM_PASSWORDS === "1") return randomBytes(9).toString("base64url") + "!1";
  return fallback;
}

async function main() {
  // The seed DELETES every row. Never let it run against a real deployment by accident.
  if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_PRODUCTION !== "1") {
    throw new Error("Refusing to seed: NODE_ENV=production would wipe all data. Set SEED_ALLOW_PRODUCTION=1 to override.");
  }
  console.log("Wiping existing seed data (dev reset)...");

  // Delete children before parents to respect FK constraints. Order matters.
  await prisma.mark.deleteMany();
  await prisma.examSubject.deleteMany();
  await prisma.examination.deleteMany();
  await prisma.feePayment.deleteMany();
  await prisma.feeVoucher.deleteMany();
  await prisma.feeStructure.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.document.deleteMany();
  await prisma.promotionHistory.deleteMany();
  await prisma.transferHistory.deleteMany();
  await prisma.timetableEntry.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.teacherSubject.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.guardianLink.deleteMany();
  await prisma.guardian.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.section.deleteMany();
  await prisma.class.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.academicSession.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.user.deleteMany();

  const credentials: { label: string; username: string; password: string }[] = [];

  // ---- Academic session -----------------------------------------------
  const now = new Date();
  const sessionYear = now.getFullYear();
  const session = await prisma.academicSession.create({
    data: {
      name: `${sessionYear}-${sessionYear + 1}`,
      startDate: new Date(sessionYear, 7, 1), // Aug 1
      endDate: new Date(sessionYear + 1, 5, 30), // Jun 30 next year
      isCurrent: true,
    },
  });

  // ---- Classes + sections -----------------------------------------------
  const classNames = ["Grade 6", "Grade 7", "Grade 8"];
  const classes = [];
  for (const name of classNames) {
    const cls = await prisma.class.create({
      data: { name, sessionId: session.id },
    });
    const sectionA = await prisma.section.create({ data: { name: "A", classId: cls.id } });
    const sectionB = await prisma.section.create({ data: { name: "B", classId: cls.id } });
    classes.push({ cls, sections: [sectionA, sectionB] });
  }

  // ---- Subjects -----------------------------------------------------------
  const subjectDefs = [
    { name: "Math", code: "MATH" },
    { name: "English", code: "ENG" },
    { name: "Science", code: "SCI" },
    { name: "Social Studies", code: "SST" },
    { name: "Computer", code: "COMP" },
    { name: "Art", code: "ART" },
  ];
  const subjects = [];
  for (const s of subjectDefs) {
    subjects.push(await prisma.subject.create({ data: s }));
  }

  // ---- Admin user -----------------------------------------------------------
  const adminPassword = seedPassword("ADMIN", "Admin@12345");
  const admin = await prisma.user.create({
    data: {
      email: "admin@school-erp.demo",
      username: "admin",
      passwordHash: await hashPassword(adminPassword),
      role: "ADMIN",
    },
  });
  credentials.push({ label: "Admin", username: "admin", password: adminPassword });

  // ---- Teachers -----------------------------------------------------------
  const teacherNames = [
    { fullName: "Sarah Ahmed", username: "teacher.sarah" },
    { fullName: "Usman Malik", username: "teacher.usman" },
    { fullName: "Nadia Khan", username: "teacher.nadia" },
  ];
  const teacherPassword = seedPassword("TEACHER", "Teacher@12345");
  const teachers = [];
  for (const t of teacherNames) {
    const user = await prisma.user.create({
      data: {
        email: `${t.username}@school-erp.demo`,
        username: t.username,
        passwordHash: await hashPassword(teacherPassword),
        role: "TEACHER",
      },
    });
    const teacher = await prisma.teacher.create({
      data: {
        userId: user.id,
        fullName: t.fullName,
        qualification: "M.Ed",
        joiningDate: new Date(sessionYear - rand(1, 5), rand(0, 11), rand(1, 28)),
        designation: "Subject Teacher",
        phone: `0300${rand(1000000, 9999999)}`,
      },
    });
    teachers.push(teacher);
  }
  credentials.push({ label: "Teacher (sarah)", username: "teacher.sarah", password: teacherPassword });

  // Assign each teacher to a spread of subject/class/section combos so
  // TeacherSubject + TimetableEntry both have real data to draw from.
  const teacherSubjectRows: { teacherId: string; subjectId: string; classId: string; sectionId: string }[] = [];
  let subjIdx = 0;
  for (const { cls, sections } of classes) {
    for (const section of sections) {
      // Each section gets 3 subjects taught by rotating teachers (keeps the
      // dataset small but still exercises multiple teachers per class).
      for (let i = 0; i < 3; i++) {
        const subject = subjects[subjIdx % subjects.length];
        const teacher = teachers[subjIdx % teachers.length];
        subjIdx++;
        teacherSubjectRows.push({
          teacherId: teacher.id,
          subjectId: subject.id,
          classId: cls.id,
          sectionId: section.id,
        });
      }
    }
  }
  for (const row of teacherSubjectRows) {
    await prisma.teacherSubject.create({ data: row });
  }

  // ---- Timetable entries (a few per section) -------------------------------
  const dayNames = [1, 2, 3, 4, 5]; // Mon-Fri
  const timeSlots = [
    { start: "08:00", end: "08:45" },
    { start: "08:45", end: "09:30" },
    { start: "09:30", end: "10:15" },
  ];
  for (const { sections } of classes) {
    for (const section of sections) {
      const rowsForSection = teacherSubjectRows.filter((r) => r.sectionId === section.id);
      let slotIdx = 0;
      for (const day of dayNames.slice(0, 2)) {
        // 2 days x up-to-3 slots per section keeps volume reasonable
        for (const slot of timeSlots) {
          const row = rowsForSection[slotIdx % rowsForSection.length];
          slotIdx++;
          await prisma.timetableEntry.create({
            data: {
              sectionId: section.id,
              subjectId: row.subjectId,
              teacherId: row.teacherId,
              dayOfWeek: day,
              startTime: slot.start,
              endTime: slot.end,
              room: `Room ${rand(101, 120)}`,
            },
          });
        }
      }
    }
  }

  // ---- Fee structures per class -----------------------------------------
  const feeCategoryDefs: { category: string; amount: number; frequency: string }[] = [
    { category: "Tuition", amount: 5000, frequency: "MONTHLY" },
    { category: "Computer", amount: 500, frequency: "MONTHLY" },
    { category: "Exam", amount: 1000, frequency: "ANNUAL" },
  ];
  const feeStructuresByClass = new Map<string, { category: string; amount: number }[]>();
  for (const { cls } of classes) {
    const rows = [];
    for (const f of feeCategoryDefs) {
      await prisma.feeStructure.create({
        data: { classId: cls.id, category: f.category, amount: f.amount, frequency: f.frequency },
      });
      // Only MONTHLY items go into the monthly voucher breakdown.
      if (f.frequency === "MONTHLY") rows.push({ category: f.category, amount: f.amount });
    }
    feeStructuresByClass.set(cls.id, rows);
  }

  // ---- Students, guardians, enrollments -----------------------------------
  const allSections = classes.flatMap(({ cls, sections }) => sections.map((s) => ({ cls, section: s })));
  const studentCount = 20;
  const students: { id: string; fullName: string; sectionId: string; classId: string }[] = [];

  // roll number counters per section
  const rollCounters = new Map<string, number>();

  let studentUserGiven = false;
  let parentUsersGiven = 0;

  for (let i = 0; i < studentCount; i++) {
    const isMale = i % 2 === 0;
    const firstName = isMale ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
    const lastName = pick(LAST_NAMES);
    const fullName = `${firstName} ${lastName}`;
    const admissionNumber = `ADM-${String(1000 + i).padStart(5, "0")}`;
    const { cls, section } = allSections[i % allSections.length];

    // Give the very first student a Student-portal login for demo completeness.
    let studentUserId: string | undefined;
    if (!studentUserGiven) {
      const studentUsername = "student.demo";
      const studentPassword = seedPassword("STUDENT", "Student@12345");
      const su = await prisma.user.create({
        data: {
          email: `${studentUsername}@school-erp.demo`,
          username: studentUsername,
          passwordHash: await hashPassword(studentPassword),
          role: "STUDENT",
        },
      });
      studentUserId = su.id;
      credentials.push({ label: "Student (demo)", username: studentUsername, password: studentPassword });
      studentUserGiven = true;
    }

    const student = await prisma.student.create({
      data: {
        admissionNumber,
        userId: studentUserId,
        fullName,
        gender: isMale ? "Male" : "Female",
        dob: new Date(sessionYear - rand(10, 14), rand(0, 11), rand(1, 28)),
        bloodGroup: pick(["A+", "B+", "O+", "AB+", "A-", "O-"]),
        phone: `0301${rand(1000000, 9999999)}`,
        address: `House ${rand(1, 200)}, Street ${rand(1, 40)}, Karachi`,
        status: "ACTIVE",
      },
    });
    students.push({ id: student.id, fullName, sectionId: section.id, classId: cls.id });

    const rollBase = rollCounters.get(section.id) ?? 0;
    const rollNumber = String(rollBase + 1).padStart(2, "0");
    rollCounters.set(section.id, rollBase + 1);

    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        academicSessionId: session.id,
        classId: cls.id,
        sectionId: section.id,
        rollNumber,
        status: "ACTIVE",
      },
    });

    // 1-2 guardians per student.
    const guardianCount = i % 3 === 0 ? 2 : 1;
    for (let g = 0; g < guardianCount; g++) {
      const relation = g === 0 ? "Father" : "Mother";
      const guardian = await prisma.guardian.create({
        data: {
          fullName: `${relation === "Father" ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F)} ${lastName}`,
          relation,
          phone: `0302${rand(1000000, 9999999)}`,
          email: `guardian${i}${g}@example.com`,
          address: `House ${rand(1, 200)}, Street ${rand(1, 40)}, Karachi`,
        },
      });

      // First 2 guardians overall get a demoable Parent portal login.
      let parentUserId: string | undefined;
      if (parentUsersGiven < 2) {
        const parentUsername = `parent.demo${parentUsersGiven + 1}`;
        const parentPassword = seedPassword("PARENT", "Parent@12345");
        const pu = await prisma.user.create({
          data: {
            email: `${parentUsername}@school-erp.demo`,
            username: parentUsername,
            passwordHash: await hashPassword(parentPassword),
            role: "PARENT",
          },
        });
        parentUserId = pu.id;
        credentials.push({ label: `Parent (${guardian.fullName})`, username: parentUsername, password: parentPassword });
        parentUsersGiven++;
      }

      await prisma.guardianLink.create({
        data: {
          studentId: student.id,
          guardianId: guardian.id,
          userId: parentUserId,
        },
      });
    }
  }

  // ---- Fee vouchers (one per student, current billing month) --------------
  const billingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let lastVoucherNumber: string | null = null;

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const breakdown = feeStructuresByClass.get(s.classId) ?? [];
    const subtotal = breakdown.reduce((sum, b) => sum + b.amount, 0);
    const discount = 0;
    const fine = 0;
    const totalPayable = subtotal + fine - discount;

    const voucherNumber = nextVoucherNumber(lastVoucherNumber);
    lastVoucherNumber = voucherNumber;

    // Genuine mix: every 3rd student PAID, every 3rd+1 PARTIALLY_PAID, rest UNPAID.
    let paidAmount = 0;
    if (i % 3 === 0) {
      paidAmount = totalPayable;
    } else if (i % 3 === 1) {
      paidAmount = Math.round(totalPayable * 0.5);
    } else {
      paidAmount = 0;
    }

    const status = computeVoucherStatus(totalPayable, paidAmount);

    const voucher = await prisma.feeVoucher.create({
      data: {
        voucherNumber,
        studentId: s.id,
        academicSessionId: session.id,
        billingMonth,
        dueDate: new Date(now.getFullYear(), now.getMonth(), 15),
        breakdown: JSON.stringify(breakdown),
        previousBalance: 0,
        discount,
        fine,
        totalPayable,
        paidAmount,
        status,
      },
    });

    if (paidAmount > 0) {
      await prisma.feePayment.create({
        data: {
          voucherId: voucher.id,
          amount: paidAmount,
          method: pick(["CASH", "BANK_TRANSFER", "ONLINE", "CHEQUE"]),
          reference: status === "PAID" ? `PMT-${voucher.voucherNumber}` : `PMT-${voucher.voucherNumber}-P1`,
          recordedById: admin.id,
        },
      });
    }
  }

  // ---- Examination + ExamSubjects + Marks ---------------------------------
  const examination = await prisma.examination.create({
    data: {
      name: `Midterm ${sessionYear}`,
      type: "MIDTERM",
      academicSessionId: session.id,
      publishedAt: new Date(),
    },
  });

  // One ExamSubject per class/subject combo (all 6 subjects for all 3 classes).
  const examSubjectsByClass = new Map<string, { id: string; totalMarks: number }[]>();
  for (const { cls } of classes) {
    const rows = [];
    for (const subject of subjects) {
      const totalMarks = 100;
      const es = await prisma.examSubject.create({
        data: {
          examinationId: examination.id,
          subjectId: subject.id,
          classId: cls.id,
          totalMarks,
          passingMarks: 40,
          examDate: new Date(sessionYear, 9, rand(1, 20)), // October
        },
      });
      rows.push({ id: es.id, totalMarks });
    }
    examSubjectsByClass.set(cls.id, rows);
  }

  // Randomized marks per student across their class's exam subjects.
  const teacherUserForMarks = admin.id; // enteredById is a plain string convention (admin recorded them)
  for (const s of students) {
    const examSubjectsForClass = examSubjectsByClass.get(s.classId) ?? [];
    for (const es of examSubjectsForClass) {
      const pct = rand(40, 95) / 100;
      const obtainedMarks = Math.round(es.totalMarks * pct);
      await prisma.mark.create({
        data: {
          examinationId: examination.id,
          examSubjectId: es.id,
          studentId: s.id,
          obtainedMarks,
          enteredById: teacherUserForMarks,
        },
      });
    }
  }

  // ---- Announcements --------------------------------------------------------
  const announcementDefs = [
    { title: "Midterm Exams Schedule Released", body: "The midterm examination schedule has been published. Please check the Exams section for your class timetable.", audience: "ALL" },
    { title: "Parent-Teacher Meeting", body: "A parent-teacher meeting will be held next Friday. All guardians are encouraged to attend.", audience: "ALL" },
    { title: "Fee Voucher Reminder", body: "Fee vouchers for this month have been generated. Please clear dues before the due date to avoid a fine.", audience: "ROLE:PARENT" },
  ];
  for (const a of announcementDefs) {
    await prisma.announcement.create({
      data: { ...a, createdById: admin.id },
    });
  }

  // ---- Print credentials -----------------------------------------------
  console.log("\n=== Seed complete. Demo login credentials ===");
  for (const c of credentials) {
    console.log(`${c.label.padEnd(28)} username: ${c.username.padEnd(16)} password: ${c.password}`);
  }
  console.log("===============================================\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
