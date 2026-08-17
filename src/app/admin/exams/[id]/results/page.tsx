"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Inbox } from "lucide-react";
import { ResultSheetTable, type ResultRow } from "@/components/exams/ResultSheetTable";

// Matches GET /api/exams/[id] (Task 14) — only the fields used on this page.
type ExamDetail = {
  id: string;
  name: string;
  examSubjects: { classId: string }[];
};

// Matches GET /api/classes (crud-factory GET).
type ClassRow = { id: string; name: string };

export default function ExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [classes, setClasses] = useState<ClassRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [classId, setClassId] = useState("");
  const [rows, setRows] = useState<ResultRow[] | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setExam(null);
    setError(null);
    setClassId("");

    Promise.all([
      fetch(`/api/exams/${id}`).then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Exam not found" : "Failed to load exam");
        return res.json();
      }),
      fetch("/api/classes").then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([examData, classData]) => {
        if (cancelled) return;
        setExam(examData);
        setClasses(Array.isArray(classData) ? classData : []);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load exam");
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Only classes actually configured on this exam's exam-subjects are offered —
  // /api/results 404s the examination lookup fine either way, but there's no
  // point letting the admin pick a class with nothing configured for this exam.
  const availableClasses = useMemo(() => {
    if (!exam || !classes) return [];
    const ids = new Set(exam.examSubjects.map((es) => es.classId));
    return classes.filter((c) => ids.has(c.id));
  }, [exam, classes]);

  useEffect(() => {
    setRows(null);
    if (!classId) return;
    setLoadingResults(true);
    fetch(`/api/results?examinationId=${id}&classId=${classId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ResultRow[]) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoadingResults(false));
  }, [id, classId]);

  const className = availableClasses.find((c) => c.id === classId)?.name ?? "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Button variant="ghost" size="sm" render={<Link href={`/admin/exams/${id}`} />}>
          <ArrowLeft />
          Back to Exam
        </Button>
      </div>

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-10 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : exam === null ? (
        <Card>
          <CardContent className="space-y-3 pt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3 print:hidden">
            <div>
              <h1 className="font-heading text-xl font-semibold">{exam.name} — Results</h1>
              <p className="text-sm text-muted-foreground">Select a class to view the result gazette.</p>
            </div>
            <div className="ml-auto space-y-1.5">
              <label className="text-xs text-muted-foreground">Class</label>
              <Select value={classId} onValueChange={(v) => setClassId(v ?? "")}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!classId ? (
            <Card>
              <CardContent>
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Inbox className="size-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Select a class to view results</p>
                </div>
              </CardContent>
            </Card>
          ) : loadingResults || rows === null ? (
            <Card>
              <CardContent className="space-y-3 pt-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </CardContent>
            </Card>
          ) : (
            <ResultSheetTable info={{ examName: exam.name, className }} rows={rows} />
          )}
        </>
      )}
    </div>
  );
}
