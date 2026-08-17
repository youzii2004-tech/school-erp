"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Inbox, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { EntityFormDialog } from "@/components/academic/EntityFormDialog";

// Matches GET /api/exams (Task 14, src/app/api/exams/route.ts) — plain
// Examination rows, ADMIN sees all of them.
type ExamRow = {
  id: string;
  name: string;
  type: string;
  academicSessionId: string;
  publishedAt: string | null;
};

type AcademicSession = { id: string; name: string };

const TYPE_OPTIONS = ["MIDTERM", "FINAL", "MONTHLY", "QUIZ", "CLASS_TEST"].map((v) => ({
  value: v,
  label: v.charAt(0) + v.slice(1).toLowerCase().replace("_", " "),
}));

// Same semantic-token convention as VOUCHER_STATUS_CLASS (src/components/fees/
// VoucherPrintView.tsx) — success for the "done" state, muted for the default.
function StatusBadge({ publishedAt }: { publishedAt: string | null }) {
  return (
    <Badge
      className={cn("border-0", publishedAt ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}
      variant="outline"
    >
      {publishedAt ? "Published" : "Draft"}
    </Badge>
  );
}

export default function ExamsPage() {
  const [refreshCount, setRefreshCount] = useState(0);
  const [sessions, setSessions] = useState<AcademicSession[] | null>(null);
  const [exams, setExams] = useState<ExamRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSessions(null);
    setExams(null);
    setError(null);

    Promise.all([
      fetch("/api/sessions").then((res) => {
        if (!res.ok) throw new Error("Failed to load sessions");
        return res.json();
      }),
      fetch("/api/exams").then((res) => {
        if (!res.ok) throw new Error("Failed to load exams");
        return res.json();
      }),
    ])
      .then(([sessionData, examData]) => {
        if (cancelled) return;
        setSessions(Array.isArray(sessionData) ? sessionData : []);
        setExams(Array.isArray(examData) ? examData : []);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load data");
      });

    return () => {
      cancelled = true;
    };
  }, [refreshCount]);

  const loading = sessions === null || exams === null;
  const sessionName = (id: string) => sessions?.find((s) => s.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Examinations</h1>
          <p className="text-sm text-muted-foreground">
            Set up exams, configure subjects and marks, then publish results.
          </p>
        </div>
        <EntityFormDialog
          title="Create Exam"
          postUrl="/api/exams"
          onCreated={() => setRefreshCount((c) => c + 1)}
          fields={[
            { name: "name", label: "Name", type: "text" },
            { name: "type", label: "Type", type: "select", options: TYPE_OPTIONS },
            { name: "academicSessionId", label: "Session", type: "select", optionsUrl: "/api/sessions" },
          ]}
        />
      </div>

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-10 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground">Try refreshing the page.</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="space-y-3 pt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : exams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Inbox className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No exams yet</p>
            <p className="text-xs text-muted-foreground">Create an exam to start configuring subjects.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.map((exam) => (
                <TableRow key={exam.id}>
                  <TableCell className="font-medium">{exam.name}</TableCell>
                  <TableCell className="text-muted-foreground">{exam.type}</TableCell>
                  <TableCell className="text-muted-foreground">{sessionName(exam.academicSessionId)}</TableCell>
                  <TableCell>
                    <StatusBadge publishedAt={exam.publishedAt} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" render={<Link href={`/admin/exams/${exam.id}`} />}>
                      <Eye />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
