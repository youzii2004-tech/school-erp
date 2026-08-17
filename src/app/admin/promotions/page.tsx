"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { Inbox, ArrowRight, GraduationCap } from "lucide-react";

type SessionRow = { id: string; name: string; isCurrent: boolean };
type ClassRow = { id: string; name: string; sessionId: string };
type SectionRow = { id: string; name: string; classId: string };
type RosterRow = { studentId: string; rollNumber: string; fullName: string };

// Confirmation-before-submit pattern matches PublishDialog in
// src/app/admin/exams/[id]/page.tsx (Task 14): promotion is irreversible (no
// "un-promote" flow in the schema — the old Enrollment is marked PROMOTED, not
// restored to ACTIVE), so it gets the same "are you sure, N records, cannot be
// undone" treatment as publishing exam results.
function PromoteDialog({
  count,
  fromLabel,
  toLabel,
  submitting,
  onConfirm,
}: {
  count: number;
  fromLabel: string;
  toLabel: string;
  submitting: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button disabled={count === 0}>
            <GraduationCap />
            Promote Selected {count > 0 ? `(${count})` : ""}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Promote {count} student{count === 1 ? "" : "s"}?</DialogTitle>
          <DialogDescription>
            {fromLabel} → {toLabel}. This marks their current enrollment as promoted and
            enrolls them in the target class and section. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
            disabled={submitting}
          >
            {submitting ? "Promoting…" : "Promote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PromotionsPage() {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [classes, setClasses] = useState<ClassRow[] | null>(null);
  const [sections, setSections] = useState<SectionRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [fromClassId, setFromClassId] = useState("");
  const [fromSectionId, setFromSectionId] = useState("");

  const [toSessionId, setToSessionId] = useState("");
  const [toClassId, setToClassId] = useState("");
  const [toSectionId, setToSectionId] = useState("");

  const [roster, setRoster] = useState<RosterRow[] | null>(null);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Reference data: sessions, classes, sections. Classes/sections come back
  // unfiltered from their CRUD routes (src/app/api/classes,sections/route.ts —
  // makeCrudRoutes has no query-param filtering), so from/to dropdowns filter
  // client-side by sessionId/classId.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/sessions").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/classes").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/sections").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([sessionData, classData, sectionData]) => {
        if (cancelled) return;
        setSessions(Array.isArray(sessionData) ? sessionData : []);
        setClasses(Array.isArray(classData) ? classData : []);
        setSections(Array.isArray(sectionData) ? sectionData : []);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Failed to load sessions, classes and sections.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentSession = useMemo(
    () => sessions?.find((s) => s.isCurrent) ?? null,
    [sessions]
  );

  // "From" side is scoped to the current session per the brief — promotion
  // moves students OUT of where they are enrolled right now.
  const fromClasses = useMemo(
    () => (classes && currentSession ? classes.filter((c) => c.sessionId === currentSession.id) : []),
    [classes, currentSession]
  );
  const fromSections = useMemo(
    () => (sections ? sections.filter((s) => s.classId === fromClassId) : []),
    [sections, fromClassId]
  );

  const toClasses = useMemo(
    () => (classes && toSessionId ? classes.filter((c) => c.sessionId === toSessionId) : []),
    [classes, toSessionId]
  );
  const toSections = useMemo(
    () => (sections ? sections.filter((s) => s.classId === toClassId) : []),
    [sections, toClassId]
  );

  // Reset dependent selections whenever their parent changes, same cascading
  // pattern as AddSubjectDialog's subject/class pickers in exams/[id]/page.tsx.
  useEffect(() => {
    setFromSectionId("");
  }, [fromClassId]);
  useEffect(() => {
    setToClassId("");
  }, [toSessionId]);
  useEffect(() => {
    setToSectionId("");
  }, [toClassId]);

  useEffect(() => {
    if (!fromSectionId) {
      setRoster(null);
      setSelected(new Set());
      return;
    }
    let cancelled = false;
    setRoster(null);
    setRosterError(null);
    setSelected(new Set());
    fetch(`/api/enrollments?sectionId=${encodeURIComponent(fromSectionId)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load roster");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setRoster(Array.isArray(data) ? data : []);
      })
      .catch((e: unknown) => {
        if (!cancelled) setRosterError(e instanceof Error ? e.message : "Failed to load roster");
      });
    return () => {
      cancelled = true;
    };
  }, [fromSectionId]);

  const toggleStudent = (studentId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const allSelected = roster !== null && roster.length > 0 && selected.size === roster.length;
  const toggleAll = () => {
    if (!roster) return;
    setSelected(allSelected ? new Set() : new Set(roster.map((r) => r.studentId)));
  };

  const fromClassName = classes?.find((c) => c.id === fromClassId)?.name ?? "";
  const fromSectionName = sections?.find((s) => s.id === fromSectionId)?.name ?? "";
  const toSessionName = sessions?.find((s) => s.id === toSessionId)?.name ?? "";
  const toClassName = classes?.find((c) => c.id === toClassId)?.name ?? "";
  const toSectionName = sections?.find((s) => s.id === toSectionId)?.name ?? "";

  const readyToPromote =
    fromSectionId !== "" && toSectionId !== "" && toClassId !== "" && toSessionId !== "" && selected.size > 0;

  const handlePromote = async () => {
    if (!readyToPromote) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromSectionId,
          toClassId,
          toSectionId,
          toAcademicSessionId: toSessionId,
          studentIds: Array.from(selected),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          res.status === 409
            ? data?.error ?? "One or more students already have an enrollment in the target session."
            : data?.error ?? "Could not process promotion."
        );
      }
      const promotedCount = data?.promoted?.length ?? 0;
      const skippedCount = data?.skipped?.length ?? 0;
      toast.add({
        title: "Promotion complete",
        description:
          skippedCount > 0
            ? `${promotedCount} student(s) promoted, ${skippedCount} skipped (stale enrollment).`
            : `${promotedCount} student(s) promoted to ${toClassName} - ${toSectionName}.`,
        type: "success",
      });
      // Reload the from-section roster: promoted students are no longer ACTIVE there.
      setFromSectionId((id) => {
        // Force the roster-loading effect to re-run even though the id itself
        // hasn't changed, by re-fetching directly here instead.
        fetch(`/api/enrollments?sectionId=${encodeURIComponent(id)}`)
          .then((r) => (r.ok ? r.json() : []))
          .then((rows) => setRoster(Array.isArray(rows) ? rows : []));
        return id;
      });
      setSelected(new Set());
    } catch (err) {
      toast.add({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Could not process promotion.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Class Promotion</h1>
        <p className="text-sm text-muted-foreground">
          Move a group of students from their current class and section into a new one.
        </p>
      </div>

      {loadError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm font-medium text-destructive">{loadError}</CardContent>
        </Card>
      ) : sessions === null || classes === null || sections === null ? (
        <Card>
          <CardContent className="space-y-3 pt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="grid gap-6 pt-4 md:grid-cols-2">
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  From — {currentSession ? currentSession.name : "No current session set"}
                </h2>
                <div className="space-y-1.5">
                  <Label htmlFor="fromClass">Class</Label>
                  <Select value={fromClassId} onValueChange={(v) => setFromClassId(v as string)}>
                    <SelectTrigger id="fromClass" className="w-full">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {fromClasses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fromSection">Section</Label>
                  <Select
                    value={fromSectionId}
                    onValueChange={(v) => setFromSectionId(v as string)}
                    disabled={!fromClassId}
                  >
                    <SelectTrigger id="fromSection" className="w-full">
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {fromSections.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground">To</h2>
                <div className="space-y-1.5">
                  <Label htmlFor="toSession">Session</Label>
                  <Select value={toSessionId} onValueChange={(v) => setToSessionId(v as string)}>
                    <SelectTrigger id="toSession" className="w-full">
                      <SelectValue placeholder="Select session" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="toClass">Class</Label>
                  <Select value={toClassId} onValueChange={(v) => setToClassId(v as string)} disabled={!toSessionId}>
                    <SelectTrigger id="toClass" className="w-full">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {toClasses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="toSection">Section</Label>
                  <Select value={toSectionId} onValueChange={(v) => setToSectionId(v as string)} disabled={!toClassId}>
                    <SelectTrigger id="toSection" className="w-full">
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {toSections.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-4">
            <h2 className="font-heading text-lg font-medium">Roster</h2>
            <PromoteDialog
              count={selected.size}
              fromLabel={`${fromClassName} - ${fromSectionName}`}
              toLabel={`${toClassName} - ${toSectionName} (${toSessionName})`}
              submitting={submitting}
              onConfirm={handlePromote}
            />
          </div>

          {!fromSectionId ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                <ArrowRight className="size-8 text-muted-foreground" />
                <p className="text-sm font-medium">Pick a class and section to load its roster</p>
              </CardContent>
            </Card>
          ) : rosterError ? (
            <Card>
              <CardContent className="py-10 text-center text-sm font-medium text-destructive">{rosterError}</CardContent>
            </Card>
          ) : roster === null ? (
            <Card>
              <CardContent className="space-y-3 pt-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </CardContent>
            </Card>
          ) : roster.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                <Inbox className="size-8 text-muted-foreground" />
                <p className="text-sm font-medium">No active students in this section</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        aria-label="Select all students"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="size-4 accent-primary"
                      />
                    </TableHead>
                    <TableHead>Roll #</TableHead>
                    <TableHead>Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.map((row) => (
                    <TableRow key={row.studentId}>
                      <TableCell>
                        <input
                          type="checkbox"
                          aria-label={`Select ${row.fullName}`}
                          checked={selected.has(row.studentId)}
                          onChange={() => toggleStudent(row.studentId)}
                          className="size-4 accent-primary"
                        />
                      </TableCell>
                      <TableCell>{row.rollNumber}</TableCell>
                      <TableCell className="font-medium">{row.fullName}</TableCell>
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
