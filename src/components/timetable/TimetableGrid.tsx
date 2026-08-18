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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox, Plus, X } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

// Mon-Sat default (dayOfWeek 0-6, JS convention: 0=Sun) — the friend commissioning
// this app runs a Pakistani school, which typically doesn't hold Sunday classes.
// Kept as a plain array constant (not hardcoded through the component) so a future
// change to a 7-day week is a one-line edit here.
export const DAYS: { value: number; label: string }[] = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

type TimetableEntryRow = {
  id: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  subject: { id: string; name: string };
  teacher: { id: string; fullName: string };
  section: { id: string; name: string; class: { id: string; name: string } };
};

type SectionRow = { id: string; name: string; classId: string };
type ClassRow = { id: string; name: string };
type SubjectRow = { id: string; name: string };
type TeacherRow = { id: string; fullName: string };

function entriesByDay(entries: TimetableEntryRow[]) {
  const map = new Map<number, TimetableEntryRow[]>();
  for (const e of entries) {
    const list = map.get(e.dayOfWeek) ?? [];
    list.push(e);
    map.set(e.dayOfWeek, list);
  }
  return map;
}

// Inline "add entry" form for one day column. TimetableEntry has no fixed period
// slots (startTime/endTime are freeform "HH:MM" strings, not a period number), so
// there's no fixed grid of clickable cells to open a form from — this form is
// scoped to whichever day column's "+ Add" button was clicked, with the section
// already fixed by the picker above the grid.
function AddEntryForm({
  sectionId,
  dayOfWeek,
  subjects,
  teachers,
  onCreated,
  onCancel,
}: {
  sectionId: string;
  dayOfWeek: number;
  subjects: SubjectRow[];
  teachers: TeacherRow[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [room, setRoom] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !teacherId || !startTime || !endTime) {
      toast.add({
        title: "Missing information",
        description: "Please select a subject, teacher, and start/end time.",
        type: "warning",
      });
      return;
    }
    if (startTime >= endTime) {
      toast.add({
        title: "Invalid time range",
        description: "Start time must be before end time.",
        type: "warning",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, subjectId, teacherId, dayOfWeek, startTime, endTime, room: room || undefined }),
      });

      if (res.status === 409) {
        const body = await res.json();
        toast.add({
          title: "Scheduling conflict",
          description: body.error ?? "This overlaps an existing timetable entry.",
          type: "warning",
        });
        return;
      }
      if (!res.ok) {
        throw new Error(res.status === 400 ? "Please check the highlighted fields." : "Could not add timetable entry.");
      }

      toast.add({ title: "Added", description: "Timetable entry created.", type: "success" });
      onCreated();
    } catch (err) {
      toast.add({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Could not add timetable entry.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5 rounded-lg border border-dashed border-border p-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Subject</Label>
        <Select
          items={subjects.map((s) => ({ value: s.id, label: s.name }))}
          value={subjectId}
          onValueChange={(v) => setSubjectId((v as string) ?? "")}
        >
          <SelectTrigger className="w-full" size="sm">
            <SelectValue placeholder="Select subject" />
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
        <Label className="text-xs">Teacher</Label>
        <Select
          items={teachers.map((t) => ({ value: t.id, label: t.fullName }))}
          value={teacherId}
          onValueChange={(v) => setTeacherId((v as string) ?? "")}
        >
          <SelectTrigger className="w-full" size="sm">
            <SelectValue placeholder="Select teacher" />
          </SelectTrigger>
          <SelectContent>
            {teachers.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs">Start</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs">End</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Room (optional)</Label>
        <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. Room 5" />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Adding…" : "Add"}
        </Button>
      </div>
    </form>
  );
}

function EntryCard({
  entry,
  showSection,
  onDeleted,
}: {
  entry: TimetableEntryRow;
  showSection: boolean;
  onDeleted?: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/timetable/${entry.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not remove timetable entry.");
      onDeleted?.(entry.id);
    } catch (err) {
      toast.add({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Could not remove timetable entry.",
        type: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-0.5 rounded-lg border border-border bg-card p-2.5 text-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">{entry.subject.name}</span>
        {onDeleted && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Remove entry"
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {entry.startTime}–{entry.endTime}
      </p>
      <p className="text-xs text-muted-foreground">{entry.teacher.fullName}</p>
      {showSection && (
        <p className="text-xs text-muted-foreground">
          {entry.section.class.name} - {entry.section.name}
        </p>
      )}
      {entry.room && <p className="text-xs text-muted-foreground">Room {entry.room}</p>}
    </div>
  );
}

// Shared grid used by both the admin (editable) and teacher (read-only) timetable
// pages. Admin: caller picks a section, cells can be added via inline forms and
// removed. Teacher: fetches the signed-in teacher's own schedule (via the
// `teacherId=me` sentinel resolved server-side in GET /api/timetable) and renders
// read-only, grouped by day, showing which section/class each entry belongs to
// since a teacher's schedule spans multiple sections.
export function TimetableGrid({ editable }: { editable: boolean }) {
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [entries, setEntries] = useState<TimetableEntryRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    if (!editable) return;
    fetch("/api/sections").then((res) => (res.ok ? res.json() : [])).then(setSections).catch(() => setSections([]));
    fetch("/api/classes").then((res) => (res.ok ? res.json() : [])).then(setClasses).catch(() => setClasses([]));
    fetch("/api/subjects").then((res) => (res.ok ? res.json() : [])).then(setSubjects).catch(() => setSubjects([]));
    fetch("/api/teachers").then((res) => (res.ok ? res.json() : [])).then(setTeachers).catch(() => setTeachers([]));
  }, [editable]);

  const classNameById = useMemo(() => {
    const map: Record<string, string> = {};
    classes.forEach((c) => (map[c.id] = c.name));
    return map;
  }, [classes]);

  useEffect(() => {
    if (editable && !sectionId) {
      setEntries(null);
      return;
    }
    const query = editable ? `sectionId=${sectionId}` : "teacherId=me";
    setLoading(true);
    fetch(`/api/timetable?${query}`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setEntries)
      .catch(() =>
        toast.add({ title: "Something went wrong", description: "Could not load the timetable.", type: "error" })
      )
      .finally(() => setLoading(false));
  }, [editable, sectionId, refreshCount]);

  const byDay = useMemo(() => entriesByDay(entries ?? []), [entries]);

  const handleCreated = () => {
    setAddingDay(null);
    setRefreshCount((c) => c + 1);
  };

  const handleDeleted = (id: string) => {
    setEntries((prev) => (prev ? prev.filter((e) => e.id !== id) : prev));
  };

  return (
    <div className="space-y-4">
      {editable && (
        <div className="max-w-xs space-y-1.5">
          <Label className="text-xs text-muted-foreground">Section</Label>
          <Select
            items={sections.map((s) => ({
              value: s.id,
              label: classNameById[s.classId] ? `${classNameById[s.classId]} - ${s.name}` : s.name,
            }))}
            value={sectionId}
            onValueChange={(v) => setSectionId((v as string) ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a section" />
            </SelectTrigger>
            <SelectContent>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {classNameById[s.classId] ? `${classNameById[s.classId]} - ${s.name}` : s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {editable && !sectionId ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Inbox className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium">Select a section to view or edit its timetable</p>
            </div>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : !entries || (entries.length === 0 && !editable) ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Inbox className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                {editable ? "No timetable entries yet" : "No timetable entries assigned to you yet"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {DAYS.map((day) => {
            const dayEntries = (byDay.get(day.value) ?? []).slice().sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
            return (
              <div key={day.value} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase">{day.label}</h3>
                  {editable && addingDay !== day.value && (
                    <button
                      type="button"
                      onClick={() => setAddingDay(day.value)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`Add entry on ${day.label}`}
                    >
                      <Plus className="size-3.5" />
                    </button>
                  )}
                </div>
                <div className={cn("space-y-2", dayEntries.length === 0 && addingDay !== day.value && "min-h-10")}>
                  {dayEntries.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      showSection={!editable}
                      onDeleted={editable ? handleDeleted : undefined}
                    />
                  ))}
                  {editable && addingDay === day.value && (
                    <AddEntryForm
                      sectionId={sectionId}
                      dayOfWeek={day.value}
                      subjects={subjects}
                      teachers={teachers}
                      onCreated={handleCreated}
                      onCancel={() => setAddingDay(null)}
                    />
                  )}
                  {dayEntries.length === 0 && addingDay !== day.value && (
                    <p className="text-xs text-muted-foreground">No classes</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
