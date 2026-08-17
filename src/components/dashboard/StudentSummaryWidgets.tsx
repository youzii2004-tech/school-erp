"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, ClipboardList, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VoucherStatusBadge } from "@/components/fees/VoucherPrintView";
import { StatTile } from "@/components/dashboard/StatTile";

// Shared body for the student and parent dashboards (Task 22 Step 7). Renders
// the same three widgets — attendance % this month, latest published result,
// current voucher status — for whichever studentId the caller passes in. The
// student page passes its own id; the parent page passes whichever child is
// currently selected. All data comes from existing, already ownership-scoped
// endpoints — no new aggregation route for this (see admin-stats for the one
// case that *does* need one).

type Enrollment = {
  status: string;
  createdAt: string;
  class: { id: string; name: string };
  section: { id: string; name: string };
};
type StudentProfile = { id: string; fullName: string; enrollments: Enrollment[] };
type ExamRow = { id: string; name: string; type: string; publishedAt: string | null };
type ResultRow = {
  studentId: string;
  percentage: number;
  grade: string;
  total: number;
  totalMax: number;
  position: number | null;
  subjects: unknown[];
};
type VoucherRow = {
  id: string;
  voucherNumber: string;
  billingMonth: string;
  totalPayable: number;
  paidAmount: number;
  status: string;
};

function currentMonthParam() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function StudentSummaryWidgets({ studentId }: { studentId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attendancePct, setAttendancePct] = useState<number | null>(null);
  const [latestExam, setLatestExam] = useState<ExamRow | null>(null);
  const [latestResult, setLatestResult] = useState<ResultRow | null>(null);
  const [voucher, setVoucher] = useState<VoucherRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setAttendancePct(null);
    setLatestExam(null);
    setLatestResult(null);
    setVoucher(null);

    (async () => {
      try {
        const profileRes = await fetch(`/api/students/${studentId}`);
        if (!profileRes.ok) throw new Error("Failed to load student profile");
        const profile: StudentProfile = await profileRes.json();
        const activeEnrollment =
          profile.enrollments.find((e) => e.status === "ACTIVE") ?? profile.enrollments[0] ?? null;
        const classId = activeEnrollment?.class.id ?? null;

        const [attRes, voucherRes, examsRes] = await Promise.all([
          fetch(`/api/attendance/summary?studentId=${studentId}&month=${currentMonthParam()}`),
          fetch(`/api/fee-vouchers?studentId=${studentId}`),
          fetch(`/api/exams`),
        ]);
        if (cancelled) return;

        if (attRes.ok) {
          const att = await attRes.json();
          setAttendancePct(att.percentage);
        }
        if (voucherRes.ok) {
          const vouchers: VoucherRow[] = await voucherRes.json();
          setVoucher(vouchers[0] ?? null);
        }

        // Latest published result: reuses the same pattern as ExamResultsTab
        // (src/components/students/StudentProfileTabs.tsx, Task 17) — published
        // exams sorted newest-first, then confirmed against GET /api/results
        // that this student actually has marks for that exam/class, taking the
        // first (most recent) match.
        if (examsRes.ok && classId) {
          const allExams: ExamRow[] = await examsRes.json();
          const published = allExams
            .filter((e) => e.publishedAt !== null)
            .sort((a, b) => (b.publishedAt! > a.publishedAt! ? 1 : -1));

          for (const exam of published) {
            const resultsRes = await fetch(`/api/results?examinationId=${exam.id}&classId=${classId}`);
            if (!resultsRes.ok) continue;
            const rows: ResultRow[] = await resultsRes.json();
            const own = rows.find((r) => r.studentId === studentId);
            if (own && own.subjects.length > 0) {
              if (!cancelled) {
                setLatestExam(exam);
                setLatestResult(own);
              }
              break;
            }
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load dashboard data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm font-medium text-destructive">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : (
          <>
            <StatTile
              label="Attendance This Month"
              value={attendancePct !== null ? `${attendancePct}%` : "—"}
              icon={CalendarCheck}
            />
            <StatTile
              label="Latest Result"
              value={latestResult ? `${Math.round(latestResult.percentage)}% (${latestResult.grade})` : "—"}
              icon={ClipboardList}
            />
            <StatTile
              label="Fee Voucher Status"
              value={voucher ? voucher.status.replace("_", " ") : "—"}
              icon={Wallet}
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest Published Result</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {loading ? (
            <Skeleton className="h-10 w-full" />
          ) : !latestExam || !latestResult ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No published exam results yet.</p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">{latestExam.name}</p>
                <p className="text-muted-foreground">
                  {latestResult.total}/{latestResult.totalMax} marks · {Math.round(latestResult.percentage)}% ·
                  Grade {latestResult.grade}
                  {latestResult.position ? ` · Position ${latestResult.position}` : ""}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Fee Voucher</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {loading ? (
            <Skeleton className="h-10 w-full" />
          ) : !voucher ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No fee vouchers issued yet.</p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">
                  {voucher.voucherNumber} · {voucher.billingMonth}
                </p>
                <p className="text-muted-foreground">
                  Rs. {voucher.paidAmount.toFixed(2)} paid of Rs. {voucher.totalPayable.toFixed(2)}
                </p>
              </div>
              <VoucherStatusBadge status={voucher.status} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
