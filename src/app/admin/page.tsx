"use client";

import { useEffect, useState } from "react";
import { Users, CalendarCheck, Wallet, ReceiptText } from "lucide-react";
import { StatTile } from "@/components/dashboard/StatTile";
import { AttendanceTrendChart, type AttendanceTrendPoint } from "@/components/charts/AttendanceTrendChart";
import { FeeCollectionChart, type FeeCollectionPoint } from "@/components/charts/FeeCollectionChart";
import { ResultDistributionChart, type ResultDistributionPoint } from "@/components/charts/ResultDistributionChart";
import { AnnouncementFeed } from "@/components/announcements/AnnouncementFeed";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Matches GET /api/dashboard/admin-stats (Task 22 Step 3).
type AdminStats = {
  totalStudents: number;
  todayAttendancePercentage: number;
  feesCollectedThisMonth: number;
  pendingVouchersCount: number;
  attendanceTrend: AttendanceTrendPoint[];
  feeCollectionTrend: FeeCollectionPoint[];
  latestExam: { id: string; name: string } | null;
  resultDistribution: ResultDistributionPoint[];
};

function formatMoney(amount: number) {
  return `Rs. ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard/admin-stats")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard stats");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load dashboard stats");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">School-wide overview.</p>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-10 text-center text-sm font-medium text-destructive">{error}</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats ? (
                <>
                  <StatTile label="Total Students" value={stats.totalStudents} icon={Users} />
                  <StatTile
                    label="Today's Attendance %"
                    value={`${stats.todayAttendancePercentage}%`}
                    icon={CalendarCheck}
                  />
                  <StatTile
                    label="Fees Collected This Month"
                    value={formatMoney(stats.feesCollectedThisMonth)}
                    icon={Wallet}
                  />
                  <StatTile label="Pending Vouchers" value={stats.pendingVouchersCount} icon={ReceiptText} />
                </>
              ) : (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {stats ? (
                <>
                  <AttendanceTrendChart data={stats.attendanceTrend} />
                  <FeeCollectionChart data={stats.feeCollectionTrend} />
                  <div className="xl:col-span-2">
                    {stats.resultDistribution.length > 0 ? (
                      <ResultDistributionChart data={stats.resultDistribution} />
                    ) : (
                      <Card>
                        <CardContent className="py-10 text-center text-sm text-muted-foreground">
                          No published exam results yet.
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </>
              ) : (
                Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="font-heading text-sm font-semibold">Announcements</h2>
            <AnnouncementFeed showComposer={false} />
          </div>
        </div>
      )}
    </div>
  );
}
