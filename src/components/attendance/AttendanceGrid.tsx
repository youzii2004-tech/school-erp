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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Inbox, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

// Matches GET /api/attendance response shape (Task 9, src/app/api/attendance/route.ts).
type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
type AttendanceRow = {
  studentId: string;
  rollNumber: string;
  fullName: string;
  status: AttendanceStatus | null;
};

// Sections come back plain (id, name, classId) from GET /api/sections — no class
// relation included by the shared crud-factory GET. Classes come back the same way
// from GET /api/classes, so we join them client-side purely for the picker label.
type SectionRow = { id: string; name: string; classId: string };
type ClassRow = { id: string; name: string };

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "LATE", label: "Late" },
  { value: "LEAVE", label: "Leave" },
];

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  PRESENT: "data-active:bg-success/15 data-active:text-success data-active:border-success/30",
  ABSENT: "data-active:bg-destructive/15 data-active:text-destructive data-active:border-destructive/30",
  LATE: "data-active:bg-warning/15 data-active:text-warning data-active:border-warning/30",
  LEAVE: "data-active:bg-primary/10 data-active:text-primary data-active:border-primary/30",
};

function todayISO() {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

// Compact 4-way segmented control per row. A dropdown Select would need one extra
// click to see the current value and doesn't scan well down a 30-50 row grid — a
// row of 4 small toggle buttons lets a teacher see and change every student's
// status at a glance without opening anything.
function StatusToggle({
  value,
  onChange,
}: {
  value: AttendanceStatus | null;
  onChange: (status: AttendanceStatus) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-border">
      {STATUS_OPTIONS.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          data-active={value === opt.value ? "" : undefined}
          onClick={() => onChange(opt.value)}
          className={cn(
            "border-input px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted",
            i > 0 && "border-l border-border",
            STATUS_STYLE[opt.value]
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function AttendanceGrid() {
  const [sections, setSections] = useState<SectionRow[] | null>(null);
  const [classes, setClasses] = useState<ClassRow[] | null>(null);
  const [sectionId, setSectionId] = useState<string>("");
  const [date, setDate] = useState<string>(todayISO());
  const [rows, setRows] = useState<AttendanceRow[] | null>(null);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/sections")
      .then((res) => (res.ok ? res.json() : []))
      .then(setSections)
      .catch(() => setSections([]));
    fetch("/api/classes")
      .then((res) => (res.ok ? res.json() : []))
      .then(setClasses)
      .catch(() => setClasses([]));
  }, []);

  const classNameById = useMemo(() => {
    const map: Record<string, string> = {};
    (classes ?? []).forEach((c) => (map[c.id] = c.name));
    return map;
  }, [classes]);

  useEffect(() => {
    if (!sectionId || !date) {
      setRows(null);
      return;
    }
    setLoadingGrid(true);
    fetch(`/api/attendance?sectionId=${sectionId}&date=${date}`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setRows)
      .catch(() =>
        toast.add({
          title: "Something went wrong",
          description: "Could not load attendance for this section/date.",
          type: "error",
        })
      )
      .finally(() => setLoadingGrid(false));
  }, [sectionId, date]);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setRows((prev) =>
      prev ? prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)) : prev
    );
  };

  const markAllPresent = () => {
    setRows((prev) => (prev ? prev.map((r) => ({ ...r, status: "PRESENT" as const })) : prev));
  };

  const handleSave = async () => {
    if (!rows || !sectionId || !date) return;
    const unmarked = rows.filter((r) => !r.status);
    if (unmarked.length > 0) {
      toast.add({
        title: "Some students are unmarked",
        description: `${unmarked.length} student(s) have no status. Mark them or use "Mark all Present" first.`,
        type: "warning",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          sectionId,
          entries: rows.map((r) => ({ studentId: r.studentId, status: r.status })),
        }),
      });
      if (!res.ok) throw new Error("Could not save attendance.");
      toast.add({ title: "Saved", description: "Attendance recorded for this section.", type: "success" });
    } catch (err) {
      toast.add({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Could not save attendance.",
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
          <label className="text-xs text-muted-foreground">Section</label>
          <Select value={sectionId} onValueChange={(v) => setSectionId(v ?? "")}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select a section" />
            </SelectTrigger>
            <SelectContent>
              {(sections ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {classNameById[s.classId] ? `${classNameById[s.classId]} - ${s.name}` : s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        </div>
        {rows && rows.length > 0 && (
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="outline" onClick={markAllPresent}>
              <CheckCheck />
              Mark all Present
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        )}
      </div>

      {!sectionId || !date ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Inbox className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium">Select a section and date to mark attendance</p>
            </div>
          </CardContent>
        </Card>
      ) : loadingGrid ? (
        <Card>
          <CardContent className="space-y-2 pt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : !rows || rows.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Inbox className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium">No active students in this section</p>
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
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.studentId}>
                  <TableCell className="font-medium">{r.rollNumber}</TableCell>
                  <TableCell>{r.fullName}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <StatusToggle value={r.status} onChange={(status) => setStatus(r.studentId, status)} />
                    </div>
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
