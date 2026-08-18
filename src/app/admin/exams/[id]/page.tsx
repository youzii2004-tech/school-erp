"use client";

import { use, useEffect, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { ArrowLeft, Inbox, CheckCircle2, Plus, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

// Matches GET /api/exams/[id] (Task 14) — Examination with `session` and
// `examSubjects` (each including `subject`) included.
type ExamSubjectRow = {
  id: string;
  subjectId: string;
  classId: string;
  totalMarks: number;
  passingMarks: number;
  examDate: string;
  subject: { id: string; name: string };
};

type ExamDetail = {
  id: string;
  name: string;
  type: string;
  academicSessionId: string;
  publishedAt: string | null;
  session: { id: string; name: string };
  examSubjects: ExamSubjectRow[];
};

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

// Publishing is irreversible — there is no un-publish flow in the schema — so this
// requires an explicit confirmation step rather than firing on a single click, and
// is disabled outright once publishedAt is already set (not just visually
// discouraged, since the API itself returns 409 on a second attempt).
function PublishDialog({ exam, onPublished }: { exam: ExamDetail; onPublished: () => void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const alreadyPublished = exam.publishedAt !== null;

  const handlePublish = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/exams/${exam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(res.status === 409 ? "This exam is already published." : body?.error ?? "Could not publish results.");
      }
      toast.add({ title: "Results published", description: "Students and parents can now see this exam.", type: "success" });
      setOpen(false);
      onPublished();
    } catch (err) {
      toast.add({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Could not publish results.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button disabled={alreadyPublished}>
            <CheckCircle2 />
            {alreadyPublished ? "Published" : "Publish Results"}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publish results?</DialogTitle>
          <DialogDescription>
            This makes marks for this exam visible to students and parents. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handlePublish} disabled={submitting}>
            {submitting ? "Publishing…" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type OptionRow = { id: string; name: string };

// Inline dialog rather than the generic EntityFormDialog (src/components/academic/
// EntityFormDialog.tsx): `examinationId` is fixed to this detail page's exam, not a
// field the admin should have to type — the generic dialog only supports
// user-editable fields (text/date/select), no way to inject a contextual value.
function AddSubjectDialog({ examinationId, onCreated }: { examinationId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subjects, setSubjects] = useState<OptionRow[]>([]);
  const [classes, setClasses] = useState<OptionRow[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [classId, setClassId] = useState("");
  const [totalMarks, setTotalMarks] = useState("");
  const [passingMarks, setPassingMarks] = useState("");
  const [examDate, setExamDate] = useState("");

  useEffect(() => {
    if (!open) return;
    setSubjectId("");
    setClassId("");
    setTotalMarks("");
    setPassingMarks("");
    setExamDate("");

    setLoadingOptions(true);
    Promise.all([
      fetch("/api/subjects").then((res) => (res.ok ? res.json() : [])),
      fetch("/api/classes").then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([subjectData, classData]) => {
        setSubjects(Array.isArray(subjectData) ? subjectData : []);
        setClasses(Array.isArray(classData) ? classData : []);
      })
      .finally(() => setLoadingOptions(false));
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subjectId || !classId || !totalMarks || !passingMarks || !examDate) {
      toast.add({
        title: "Missing information",
        description: "Please fill in subject, class, marks and exam date.",
        type: "warning",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/exam-subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examinationId, subjectId, classId, totalMarks, passingMarks, examDate }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          res.status === 409
            ? body?.error ?? "This subject is already configured for this exam and class."
            : res.status === 400
              ? "Please check the highlighted fields."
              : body?.error ?? "Could not add subject."
        );
      }
      toast.add({ title: "Subject added", description: "The subject has been configured for this exam.", type: "success" });
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.add({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Could not add subject.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus />
            Add Subject
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Subject</DialogTitle>
          <DialogDescription>Configure a subject, class and marks for this exam.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Select
              items={subjects.map((s) => ({ value: s.id, label: s.name }))}
              value={subjectId}
              onValueChange={(v) => setSubjectId(v as string)}
              disabled={loadingOptions}
            >
              <SelectTrigger id="subject" className="w-full">
                <SelectValue placeholder={loadingOptions ? "Loading…" : "Select subject"} />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="class">Class</Label>
            <Select
              items={classes.map((c) => ({ value: c.id, label: c.name }))}
              value={classId}
              onValueChange={(v) => setClassId(v as string)}
              disabled={loadingOptions}
            >
              <SelectTrigger id="class" className="w-full">
                <SelectValue placeholder={loadingOptions ? "Loading…" : "Select class"} />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="totalMarks">Total Marks</Label>
              <Input
                id="totalMarks"
                type="number"
                min="0"
                step="0.5"
                required
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="passingMarks">Passing Marks</Label>
              <Input
                id="passingMarks"
                type="number"
                min="0"
                step="0.5"
                required
                value={passingMarks}
                onChange={(e) => setPassingMarks(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="examDate">Exam Date</Label>
            <Input id="examDate" type="date" required value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setExam(null);
    setError(null);

    fetch(`/api/exams/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Exam not found" : "Failed to load exam");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setExam(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load exam");
      });

    return () => {
      cancelled = true;
    };
  }, [id, refreshCount]);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" render={<Link href="/admin/exams" />}>
        <ArrowLeft />
        Back to Exams
      </Button>

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
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-2xl font-semibold">{exam.name}</h1>
                <StatusBadge publishedAt={exam.publishedAt} />
              </div>
              <p className="text-sm text-muted-foreground">
                {exam.type} · {exam.session.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" render={<Link href={`/admin/exams/${exam.id}/results`} />}>
                <ClipboardList />
                View Results
              </Button>
              <PublishDialog exam={exam} onPublished={() => setRefreshCount((c) => c + 1)} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <h2 className="font-heading text-lg font-medium">Subjects</h2>
            <AddSubjectDialog examinationId={exam.id} onCreated={() => setRefreshCount((c) => c + 1)} />
          </div>

          {exam.examSubjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                <Inbox className="size-8 text-muted-foreground" />
                <p className="text-sm font-medium">No subjects configured</p>
                <p className="text-xs text-muted-foreground">Add a subject to start recording marks.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Total Marks</TableHead>
                    <TableHead>Passing Marks</TableHead>
                    <TableHead>Exam Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exam.examSubjects.map((es) => (
                    <TableRow key={es.id}>
                      <TableCell className="font-medium">{es.subject.name}</TableCell>
                      <TableCell>{es.totalMarks}</TableCell>
                      <TableCell>{es.passingMarks}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(es.examDate).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
