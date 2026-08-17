"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Printer, School } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResultRow } from "@/components/exams/ResultSheetTable";

// Same placeholder pattern as Topbar.tsx (Task 5): no real institute-settings
// endpoint exists yet, so read a build-time env var with a static fallback
// rather than hardcoding a different string on this print view.
const INSTITUTE_NAME = process.env.NEXT_PUBLIC_INSTITUTE_NAME || "School ERP";

export type MarksheetExam = {
  name: string;
  type: string;
};

export type MarksheetStudent = {
  fullName: string;
  admissionNumber: string;
  photoPath: string | null;
  className: string;
  sectionName: string;
  rollNumber: string;
  enrollmentStatus: string;
};

// One row from GET /api/results?examinationId&classId (Task 15), already
// filtered client-side (page.tsx) down to this single student. `null` means
// no result row exists yet for this student on this exam (no Mark rows
// entered) — rendered as an explicit "not graded yet" state, not a blank table.
export type MarksheetResult = ResultRow | null;

// GET /api/attendance/summary (Task 9) response, scoped to a single
// representative month for this exam — see page.tsx for how the month is
// chosen and MONTH LABEL below for why this is disclosed on-screen rather
// than implied as a full-term aggregate.
export type MarksheetAttendance = { percentage: number; monthLabel: string } | null;

function percentageBadgeClass(pct: number) {
  if (pct >= 75) return "bg-success/10 text-success";
  if (pct >= 50) return "bg-warning/10 text-warning";
  return "bg-destructive/10 text-destructive";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function MarksheetView({
  exam,
  student,
  result,
  attendance,
}: {
  exam: MarksheetExam;
  student: MarksheetStudent;
  result: MarksheetResult;
  attendance: MarksheetAttendance;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end print:hidden">
        <Button type="button" variant="outline" onClick={() => window.print()}>
          <Printer />
          Print
        </Button>
      </div>

      {/* Same A4-proportioned print card as VoucherPrintView (Task 13) — DashboardShell
          already hides the sidebar/topbar globally on print, so only this card's own
          chrome needs print:hidden / print:border-0 treatment. */}
      <Card className="mx-auto w-full max-w-[210mm] min-h-[297mm] print:border-0 print:shadow-none">
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <School className="size-6" />
              </div>
              <div>
                <p className="font-heading text-lg font-semibold">{INSTITUTE_NAME}</p>
                <p className="text-xs text-muted-foreground">Report Card</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-heading text-lg font-semibold">{exam.name}</p>
              <p className="text-xs text-muted-foreground">{exam.type.replace("_", " ")}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Avatar size="lg">
              {student.photoPath && <AvatarImage src={student.photoPath} alt={student.fullName} />}
              <AvatarFallback>{initials(student.fullName) || "?"}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Student</p>
                <p className="text-sm font-medium">{student.fullName}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Admission #</p>
                <p className="text-sm font-medium">{student.admissionNumber}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Class / Section</p>
                <p className="text-sm font-medium">
                  {student.className} - {student.sectionName}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Roll #</p>
                <p className="text-sm font-medium">{student.rollNumber}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Subject-wise Marks</p>
            {result === null ? (
              <p className="rounded-lg border border-border py-6 text-center text-sm text-muted-foreground">
                No marks entered for this student on this exam yet.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-right">Obtained</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.subjects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No subject marks recorded.
                        </TableCell>
                      </TableRow>
                    ) : (
                      result.subjects.map((s, i) => (
                        <TableRow key={`${s.subjectName}-${i}`}>
                          <TableCell>{s.subjectName}</TableCell>
                          <TableCell className="text-right">{s.obtained}</TableCell>
                          <TableCell className="text-right">{s.total}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {result !== null && (
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4 sm:grid-cols-4">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-sm font-semibold">
                  {result.total}/{result.totalMax}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Percentage</p>
                <p className="text-sm font-semibold">{result.percentage.toFixed(1)}%</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Grade</p>
                <p className="text-sm font-semibold">{result.grade}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Position</p>
                <p className="text-sm font-semibold">{result.position ?? "—"}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">
                {attendance ? `Attendance (as of ${attendance.monthLabel})` : "Attendance"}
              </p>
              {attendance ? (
                <Badge className={cn("border-0", percentageBadgeClass(attendance.percentage))} variant="outline">
                  {attendance.percentage}%
                </Badge>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">—</p>
              )}
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Promotion Status</p>
              <p className="text-sm font-medium">{student.enrollmentStatus}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Remarks</p>
              <p className="text-sm font-medium">—</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
