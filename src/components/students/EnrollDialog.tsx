"use client";

import { useEffect, useState, type ReactElement } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Plus } from "lucide-react";

type AcademicSession = { id: string; name: string; isCurrent: boolean };
type SchoolClass = { id: string; name: string; sessionId: string };
type SchoolSection = { id: string; name: string; classId: string };

interface EnrollDialogProps {
  studentId: string;
  onEnrolled: () => void;
  trigger?: ReactElement;
}

export function EnrollDialog({ studentId, onEnrolled, trigger }: EnrollDialogProps) {
  const [open, setOpen] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<SchoolSection[]>([]);

  const [sessionId, setSessionId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [rollNumber, setRollNumber] = useState("");

  // Same fetch-on-open pattern as EntityFormDialog (src/components/academic/EntityFormDialog.tsx):
  // fetch the Task 4 list endpoints when the dialog opens rather than on mount.
  useEffect(() => {
    if (!open) return;
    setSessionId("");
    setClassId("");
    setSectionId("");
    setRollNumber("");

    setLoadingOptions(true);
    Promise.all([
      fetch("/api/sessions").then((res) => (res.ok ? res.json() : [])),
      fetch("/api/classes").then((res) => (res.ok ? res.json() : [])),
      fetch("/api/sections").then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([sessionsData, classesData, sectionsData]) => {
        setSessions(sessionsData);
        setClasses(classesData);
        setSections(sectionsData);
        const current = (sessionsData as AcademicSession[]).find((s) => s.isCurrent);
        if (current) setSessionId(current.id);
      })
      .finally(() => setLoadingOptions(false));
  }, [open]);

  const filteredClasses = classes.filter((c) => !sessionId || c.sessionId === sessionId);
  const filteredSections = sections.filter((s) => !classId || s.classId === classId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionId || !classId || !sectionId || !rollNumber) {
      toast.add({
        title: "Missing information",
        description: "Please select session, class, section and enter a roll number.",
        type: "warning",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          academicSessionId: sessionId,
          classId,
          sectionId,
          rollNumber,
        }),
      });

      if (res.status === 409) {
        const body = await res.json();
        toast.add({
          title: "Enrollment conflict",
          description: body.error ?? "This student or roll number is already taken.",
          type: "error",
        });
        return;
      }

      if (!res.ok) {
        throw new Error(
          res.status === 400 ? "Please check the highlighted fields." : "Could not create enrollment."
        );
      }

      toast.add({
        title: "Enrolled",
        description: "Student enrolled successfully.",
        type: "success",
      });
      setOpen(false);
      onEnrolled();
    } catch (err) {
      toast.add({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Could not create enrollment.",
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
          trigger ?? (
            <Button>
              <Plus />
              Enroll Student
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enroll Student</DialogTitle>
          <DialogDescription>Assign a session, class, section and roll number.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="session">Session</Label>
            <Select
              value={sessionId}
              onValueChange={(v) => {
                setSessionId(v as string);
                setClassId("");
                setSectionId("");
              }}
              disabled={loadingOptions}
            >
              <SelectTrigger id="session" className="w-full">
                <SelectValue placeholder={loadingOptions ? "Loading…" : "Select session"} />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    {s.isCurrent ? " (Current)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="class">Class</Label>
            <Select
              value={classId}
              onValueChange={(v) => {
                setClassId(v as string);
                setSectionId("");
              }}
              disabled={loadingOptions || !sessionId}
            >
              <SelectTrigger id="class" className="w-full">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {filteredClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="section">Section</Label>
            <Select value={sectionId} onValueChange={(v) => setSectionId(v as string)} disabled={loadingOptions || !classId}>
              <SelectTrigger id="section" className="w-full">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {filteredSections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rollNumber">Roll Number</Label>
            <Input
              id="rollNumber"
              type="text"
              required
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enrolling…" : "Enroll"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
