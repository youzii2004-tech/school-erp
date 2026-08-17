"use client";

import { useEffect, useState } from "react";
import { StudentSummaryWidgets } from "@/components/dashboard/StudentSummaryWidgets";
import { AnnouncementFeed } from "@/components/announcements/AnnouncementFeed";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Matches the PARENT branch added to GET /api/students (Task 22) — resolves
// this parent's linked children server-side from their GuardianLink rows,
// same ownership pattern as the PARENT branches of GET /api/fee-vouchers,
// /api/results, /api/exams (never exposes raw GuardianLink rows).
type StudentRow = { id: string; fullName: string };

export default function ParentDashboardPage() {
  const [children, setChildren] = useState<StudentRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/students")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load your children");
        return res.json();
      })
      .then((rows: StudentRow[]) => {
        if (cancelled) return;
        setChildren(rows);
        if (rows.length === 0) setError("No students are linked to your account.");
        else setSelectedId(rows[0].id);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load your children");
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Attendance, results, and fees for your children.</p>
        </div>
        {children.length > 1 && (
          <Select value={selectedId} onValueChange={(v) => setSelectedId((v as string) ?? "")}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select child" />
            </SelectTrigger>
            <SelectContent>
              {children.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
          <div className="lg:col-span-2">
            {selectedId && <StudentSummaryWidgets key={selectedId} studentId={selectedId} />}
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
