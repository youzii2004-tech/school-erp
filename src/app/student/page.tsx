"use client";

import { useEffect, useState } from "react";
import { StudentSummaryWidgets } from "@/components/dashboard/StudentSummaryWidgets";
import { AnnouncementFeed } from "@/components/announcements/AnnouncementFeed";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Matches the STUDENT branch added to GET /api/students (Task 22) — resolves
// the signed-in student's own record server-side from session.user.id.
type StudentRow = { id: string; fullName: string };

export default function StudentDashboardPage() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/students")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load your student profile");
        return res.json();
      })
      .then((rows: StudentRow[]) => {
        if (cancelled) return;
        if (rows.length === 0) setError("No student profile is linked to your account.");
        else setStudentId(rows[0].id);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load your student profile");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your attendance, results, and fees at a glance.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-10 text-center text-sm font-medium text-destructive">{error}</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">{studentId && <StudentSummaryWidgets studentId={studentId} />}</div>
          <div className="space-y-3">
            <h2 className="font-heading text-sm font-semibold">Announcements</h2>
            <AnnouncementFeed showComposer={false} />
          </div>
        </div>
      )}
    </div>
  );
}
