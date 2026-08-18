"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Inbox, Lock } from "lucide-react";
import { toast } from "@/components/ui/toast";

// Matches GET /api/exams (Task 14) — TEACHER branch already scopes this to the
// teacher's own classes, so every exam returned here is one this teacher has at
// least one subject in.
type ExamRow = { id: string; name: string; type: string; publishedAt: string | null };

// Matches GET /api/exam-subjects?examinationId= (added in this task,
// src/app/api/exam-subjects/route.ts) — includes `subject` and `examination` so
// the publish lock can be read straight off the selected row.
type ExamSubjectRow = {
  id: string;
  subjectId: string;
  classId: string;
  totalMarks: number;
  passingMarks: number;
  subject: { id: string; name: string };
  examination: { id: string; publishedAt: string | null };
};

// Matches GET /api/teacher-subjects (added in this task,
// src/app/api/teacher-subjects/route.ts) — this teacher's own TeacherSubject rows.
type TeacherSubjectRow = { id: string; subjectId: string; classId: string; sectionId: string };

// Matches GET /api/classes (crud-factory GET) — plain rows, used only to label the
// exam-subject picker (exam-subjects don't carry a class name).
type ClassRow = { id: string; name: string };

// Matches GET /api/enrollments?classId= (added in this task,
// src/app/api/enrollments/route.ts).
type RosterRow = { studentId: string; rollNumber: string; fullName: string };

// Matches GET /api/marks?examSubjectId= (Task 15, src/app/api/marks/route.ts) —
// Mark rows with `student` included; only obtainedMarks/studentId are used here.
type MarkRow = { studentId: string; obtainedMarks: number };

export function MarksEntryGrid() {
  const [exams, setExams] = useState<ExamRow[] | null>(null);
  const [classes, setClasses] = useState<ClassRow[] | null>(null);
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubjectRow[] | null>(null);

  const [examinationId, setExaminationId] = useState("");
  const [examSubjects, setExamSubjects] = useState<ExamSubjectRow[] | null>(null);
  const [loadingExamSubjects, setLoadingExamSubjects] = useState(false);

  const [examSubjectId, setExamSubjectId] = useState("");
  const [roster, setRoster] = useState<RosterRow[] | null>(null);
  const [marksByStudent, setMarksByStudent] = useState<Record<string, string>>({});
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/exams")
      .then((res) => (res.ok ? res.json() : []))
      .then(setExams)
      .catch(() => setExams([]));
    fetch("/api/classes")
      .then((res) => (res.ok ? res.json() : []))
      .then(setClasses)
      .catch(() => setClasses([]));
    fetch("/api/teacher-subjects")
      .then((res) => (res.ok ? res.json() : []))
      .then(setTeacherSubjects)
      .catch(() => setTeacherSubjects([]));
  }, []);

  const classNameById = useMemo(() => {
    const map: Record<string, string> = {};
    (classes ?? []).forEach((c) => (map[c.id] = c.name));
    return map;
  }, [classes]);

  // Assigned (subjectId, classId) pairs for this teacher — the exam-subjects list
  // is filtered client-side to only these, since GET /api/exam-subjects returns
  // every subject configured for the exam, not just this teacher's.
  const assignedPairs = useMemo(() => {
    const set = new Set<string>();
    (teacherSubjects ?? []).forEach((ts) => set.add(`${ts.subjectId}:${ts.classId}`));
    return set;
  }, [teacherSubjects]);

  useEffect(() => {
    setExamSubjectId("");
    setExamSubjects(null);
    if (!examinationId) return;
    setLoadingExamSubjects(true);
    fetch(`/api/exam-subjects?examinationId=${examinationId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ExamSubjectRow[]) =>
        setExamSubjects(
          Array.isArray(data) ? data.filter((es) => assignedPairs.has(`${es.subjectId}:${es.classId}`)) : []
        )
      )
      .catch(() =>
        toast.add({ title: "Something went wrong", description: "Could not load subjects for this exam.", type: "error" })
      )
      .finally(() => setLoadingExamSubjects(false));
    // teacherSubjects loads once on mount and is stable after that — assignedPairs
    // only needs to be re-derived, not re-triggered, when it settles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examinationId, teacherSubjects !== null]);

  const selectedExamSubject = useMemo(
    () => (examSubjects ?? []).find((es) => es.id === examSubjectId) ?? null,
    [examSubjects, examSubjectId]
  );
  const locked = !!selectedExamSubject?.examination.publishedAt;

  useEffect(() => {
    setRoster(null);
    setMarksByStudent({});
    if (!selectedExamSubject) return;
    setLoadingGrid(true);
    Promise.all([
      fetch(`/api/enrollments?classId=${selectedExamSubject.classId}`).then((res) => (res.ok ? res.json() : [])),
      fetch(`/api/marks?examSubjectId=${selectedExamSubject.id}`).then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([rosterData, markData]: [RosterRow[], MarkRow[]]) => {
        setRoster(Array.isArray(rosterData) ? rosterData : []);
        const map: Record<string, string> = {};
        (Array.isArray(markData) ? markData : []).forEach((m) => {
          map[m.studentId] = String(m.obtainedMarks);
        });
        setMarksByStudent(map);
      })
      .catch(() =>
        toast.add({ title: "Something went wrong", description: "Could not load the class roster.", type: "error" })
      )
      .finally(() => setLoadingGrid(false));
  }, [selectedExamSubject]);

  const setMark = (studentId: string, raw: string) => {
    if (!selectedExamSubject) return;
    if (raw === "") {
      setMarksByStudent((prev) => ({ ...prev, [studentId]: "" }));
      return;
    }
    const num = Number(raw);
    if (Number.isNaN(num)) return;
    // Clamp to [0, totalMarks] client-side per spec — /api/marks (Task 15) is the
    // authoritative validator server-side, this is UX only.
    const clamped = Math.min(Math.max(num, 0), selectedExamSubject.totalMarks);
    setMarksByStudent((prev) => ({ ...prev, [studentId]: String(clamped) }));
  };

  const handleSave = async () => {
    if (!selectedExamSubject || !roster) return;
    const entries = roster
      .filter((r) => marksByStudent[r.studentId] !== undefined && marksByStudent[r.studentId] !== "")
      .map((r) => ({ studentId: r.studentId, obtainedMarks: Number(marksByStudent[r.studentId]) }));
    if (entries.length === 0) {
      toast.add({ title: "Nothing to save", description: "Enter at least one mark first.", type: "warning" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examSubjectId: selectedExamSubject.id, entries }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Could not save marks.");
      }
      toast.add({ title: "Saved", description: "Marks recorded for this subject.", type: "success" });
    } catch (err) {
      toast.add({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Could not save marks.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Exam</label>
          <Select
            items={(exams ?? []).map((e) => ({ value: e.id, label: e.name }))}
            value={examinationId}
            onValueChange={(v) => setExaminationId(v ?? "")}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder={exams === null ? "Loading…" : "Select an exam"} />
            </SelectTrigger>
            <SelectContent>
              {(exams ?? []).map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Subject</label>
          <Select
            items={(examSubjects ?? []).map((es) => ({
              value: es.id,
              label: `${es.subject.name} — ${classNameById[es.classId] ?? es.classId}`,
            }))}
            value={examSubjectId}
            onValueChange={(v) => setExamSubjectId(v ?? "")}
            disabled={!examinationId || loadingExamSubjects}
          >
            <SelectTrigger className="w-64">
              <SelectValue
                placeholder={
                  !examinationId ? "Select an exam first" : loadingExamSubjects ? "Loading…" : "Select a subject"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {(examSubjects ?? []).map((es) => (
                <SelectItem key={es.id} value={es.id}>
                  {es.subject.name} — {classNameById[es.classId] ?? es.classId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {roster && roster.length > 0 && !locked && (
          <div className="ml-auto">
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        )}
      </div>

      {examinationId && !loadingExamSubjects && examSubjects !== null && examSubjects.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Inbox className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium">No subjects assigned to you for this exam</p>
            </div>
          </CardContent>
        </Card>
      ) : !selectedExamSubject ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Inbox className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium">Select an exam and subject to enter marks</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {locked && (
            <Badge className="w-fit gap-1.5 border-0 bg-warning/10 px-3 py-1.5 text-warning" variant="outline">
              <Lock className="size-3.5" />
              Results published — locked
            </Badge>
          )}

          {loadingGrid ? (
            <Card>
              <CardContent className="space-y-2 pt-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </CardContent>
            </Card>
          ) : !roster || roster.length === 0 ? (
            <Card>
              <CardContent>
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Inbox className="size-8 text-muted-foreground" />
                  <p className="text-sm font-medium">No active students in this class</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Roll #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-40 text-right">
                      Marks (/ {selectedExamSubject.totalMarks})
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.map((r) => (
                    <TableRow key={r.studentId}>
                      <TableCell className="font-medium">{r.rollNumber}</TableCell>
                      <TableCell>{r.fullName}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          max={selectedExamSubject.totalMarks}
                          step="0.5"
                          disabled={locked}
                          value={marksByStudent[r.studentId] ?? ""}
                          onChange={(e) => setMark(r.studentId, e.target.value)}
                          className="ml-auto w-24 text-right"
                        />
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
