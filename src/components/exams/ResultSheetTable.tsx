"use client";

import { useMemo } from "react";
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

// Matches GET /api/results?examinationId&classId (Task 15,
// src/app/api/results/route.ts) — one row per student, already class-scoped.
export type ResultSubjectMark = { subjectName: string; obtained: number; total: number };
export type ResultRow = {
  studentId: string;
  fullName: string;
  total: number;
  totalMax: number;
  percentage: number;
  grade: string;
  position: number | null;
  subjects: ResultSubjectMark[];
};

export type ResultSheetInfo = { examName: string; className: string };

export function ResultSheetTable({ info, rows }: { info: ResultSheetInfo; rows: ResultRow[] }) {
  // Subject columns are the union across all rows, in the order first seen — a
  // student missing a Mark row for one subject (see GET /api/results' documented
  // design choice: not-yet-graded subjects are excluded from that student's
  // total/totalMax, not scored 0) still gets an empty cell in that column rather
  // than the whole sheet losing the column.
  const subjectNames = useMemo(() => {
    const seen: string[] = [];
    for (const r of rows) {
      for (const s of r.subjects) {
        if (!seen.includes(s.subjectName)) seen.push(s.subjectName);
      }
    }
    return seen;
  }, [rows]);

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        if (a.position === null && b.position === null) return 0;
        if (a.position === null) return 1;
        if (b.position === null) return -1;
        return a.position - b.position;
      }),
    [rows]
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end print:hidden">
        <Button type="button" variant="outline" onClick={() => window.print()}>
          <Printer />
          Print
        </Button>
      </div>

      <Card className="mx-auto w-full max-w-[297mm] print:border-0 print:shadow-none">
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <School className="size-6" />
              </div>
              <div>
                <p className="font-heading text-lg font-semibold">School ERP</p>
                <p className="text-xs text-muted-foreground">Result Gazette</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-heading text-lg font-semibold">{info.examName}</p>
              <p className="text-xs text-muted-foreground">{info.className}</p>
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No results to show yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Position</TableHead>
                    <TableHead>Name</TableHead>
                    {subjectNames.map((name) => (
                      <TableHead key={name} className="text-right">
                        {name}
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRows.map((r) => {
                    const bySubject = Object.fromEntries(r.subjects.map((s) => [s.subjectName, s]));
                    return (
                      <TableRow key={r.studentId}>
                        <TableCell className="font-medium">{r.position ?? "—"}</TableCell>
                        <TableCell>{r.fullName}</TableCell>
                        {subjectNames.map((name) => {
                          const mark = bySubject[name];
                          return (
                            <TableCell key={name} className="text-right text-muted-foreground">
                              {mark ? `${mark.obtained}/${mark.total}` : "—"}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right font-medium">
                          {r.total}/{r.totalMax}
                        </TableCell>
                        <TableCell className="text-right">{r.percentage.toFixed(1)}%</TableCell>
                        <TableCell className="text-right font-medium">{r.grade}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
