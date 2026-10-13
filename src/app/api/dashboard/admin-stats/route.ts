import { NextResponse } from "next/server";
import { requireRole, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateAttendancePercentage } from "@/lib/attendance-stats";
import { calculateGrade } from "@/lib/grading";

// Task 22 Step 3. ADMIN/TEACHER only, per the brief. Aggregates everything the
// admin dashboard's stat tiles + charts need in one round trip rather than
// spreading it across several client-side fetches — this is a purpose-built
// aggregation route (unlike the student/parent dashboards, which reuse
// existing per-entity endpoints, per the task's data-source guidance).

function monthRange(year: number, month0: number) {
  const start = new Date(year, month0, 1);
  const end = new Date(year, month0 + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

// Last 6 calendar months including the current one, oldest first. SQLite has
// no native date-trunc to group by month in one query, so this drives 6
// small per-month queries instead (Prisma/SQLite, MVP scale — fine).
function last6Months(): { year: number; month0: number; label: string }[] {
  const now = new Date();
  const out: { year: number; month0: number; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      year: d.getFullYear(),
      month0: d.getMonth(),
      label: d.toLocaleString("en-US", { month: "short" }),
    });
  }
  return out;
}

export async function GET() {
  const session = await getSession();
  if (!requireRole(session, ["ADMIN", "TEACHER"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();

  const [totalStudents, todayAttendance, currentMonthPayments, pendingVouchers, months] =
    await Promise.all([
      prisma.student.count({ where: { status: "ACTIVE", deletedAt: null } }),
      (async () => {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        return prisma.attendance.findMany({
          where: { date: { gte: todayStart, lte: todayEnd } },
        });
      })(),
      (async () => {
        const { start, end } = monthRange(now.getFullYear(), now.getMonth());
        return prisma.feePayment.findMany({
          where: { deletedAt: null, paidAt: { gte: start, lte: end } },
        });
      })(),
      prisma.feeVoucher.count({
        where: { deletedAt: null, status: { in: ["UNPAID", "PARTIALLY_PAID"] } },
      }),
      last6Months(),
    ]);

  const todayAttendancePercentage = calculateAttendancePercentage(todayAttendance);
  const feesCollectedThisMonth = currentMonthPayments.reduce((sum, p) => sum + p.amount, 0);

  const attendanceTrend = await Promise.all(
    months.map(async ({ year, month0, label }) => {
      const { start, end } = monthRange(year, month0);
      const records = await prisma.attendance.findMany({ where: { date: { gte: start, lte: end } } });
      return { month: label, percentage: calculateAttendancePercentage(records) };
    })
  );

  const feeCollectionTrend = await Promise.all(
    months.map(async ({ year, month0, label }) => {
      const { start, end } = monthRange(year, month0);
      const payments = await prisma.feePayment.findMany({
        where: { deletedAt: null, paidAt: { gte: start, lte: end } },
      });
      return { month: label, amount: payments.reduce((sum, p) => sum + p.amount, 0) };
    })
  );

  // Most recent published exam's grade distribution. Mirrors the aggregation
  // pattern in GET /api/results (src/app/api/results/route.ts): sum obtained/
  // total per student across the exam's ExamSubjects, using only subjects the
  // student actually has a Mark row for (same "exclude ungraded subject"
  // choice documented there), then bucket by calculateGrade.
  const latestExam = await prisma.examination.findFirst({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
  });

  let resultDistribution: { grade: string; count: number }[] = [];
  if (latestExam) {
    const examSubjects = await prisma.examSubject.findMany({
      where: { examinationId: latestExam.id, deletedAt: null },
    });
    const examSubjectById = new Map(examSubjects.map((es) => [es.id, es]));
    const examSubjectIds = examSubjects.map((es) => es.id);
    const marks = examSubjectIds.length
      ? await prisma.mark.findMany({ where: { examSubjectId: { in: examSubjectIds } } })
      : [];

    const byStudent = new Map<string, { obtained: number; total: number }>();
    for (const m of marks) {
      const es = examSubjectById.get(m.examSubjectId)!;
      const cur = byStudent.get(m.studentId) ?? { obtained: 0, total: 0 };
      cur.obtained += m.obtainedMarks;
      cur.total += es.totalMarks;
      byStudent.set(m.studentId, cur);
    }

    const gradeCounts = new Map<string, number>();
    for (const { obtained, total } of byStudent.values()) {
      const percentage = total > 0 ? (obtained / total) * 100 : 0;
      const grade = calculateGrade(percentage);
      gradeCounts.set(grade, (gradeCounts.get(grade) ?? 0) + 1);
    }
    resultDistribution = [...gradeCounts.entries()].map(([grade, count]) => ({ grade, count }));
  }

  return NextResponse.json({
    totalStudents,
    todayAttendancePercentage,
    feesCollectedThisMonth,
    pendingVouchersCount: pendingVouchers,
    attendanceTrend,
    feeCollectionTrend,
    latestExam: latestExam ? { id: latestExam.id, name: latestExam.name } : null,
    resultDistribution,
  });
}
