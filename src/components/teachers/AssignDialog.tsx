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

type Subject = { id: string; name: string };
type SchoolClass = { id: string; name: string };
type SchoolSection = { id: string; name: string; classId: string };

interface AssignDialogProps {
  teacherId: string;
  onAssigned: () => void;
  trigger?: ReactElement;
}

// Same fetch-on-open pattern as EnrollDialog (src/components/students/EnrollDialog.tsx):
// pull the Task 4 list endpoints (/api/subjects, /api/classes, /api/sections) when
// the dialog opens, then post to /api/teacher-subjects (Task 18).
export function AssignDialog({ teacherId, onAssigned, trigger }: AssignDialogProps) {
  const [open, setOpen] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<SchoolSection[]>([]);

  const [subjectId, setSubjectId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  useEffect(() => {
    if (!open) return;
    setSubjectId("");
    setClassId("");
    setSectionId("");

    setLoadingOptions(true);
    Promise.all([
      fetch("/api/subjects").then((res) => (res.ok ? res.json() : [])),
      fetch("/api/classes").then((res) => (res.ok ? res.json() : [])),
      fetch("/api/sections").then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([subjectsData, classesData, sectionsData]) => {
        setSubjects(subjectsData);
        setClasses(classesData);
        setSections(sectionsData);
      })
      .finally(() => setLoadingOptions(false));
  }, [open]);

  const filteredSections = sections.filter((s) => !classId || s.classId === classId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subjectId || !classId || !sectionId) {
      toast.add({
        title: "Missing information",
        description: "Please select a subject, class and section.",
        type: "warning",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/teacher-subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, subjectId, classId, sectionId }),
      });

      if (res.status === 409) {
        const body = await res.json();
        toast.add({
          title: "Already assigned",
          description: body.error ?? "This teacher is already assigned to this subject/class/section.",
          type: "warning",
        });
        return;
      }

      if (!res.ok) {
        throw new Error(
          res.status === 400 ? "Please check the highlighted fields." : "Could not create assignment."
        );
      }

      toast.add({
        title: "Assigned",
        description: "Class/subject assignment created.",
        type: "success",
      });
      setOpen(false);
      onAssigned();
    } catch (err) {
      toast.add({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Could not create assignment.",
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
              Assign Class/Subject
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Class/Subject</DialogTitle>
          <DialogDescription>Assign this teacher to a subject, class and section.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Select value={subjectId} onValueChange={(v) => setSubjectId(v as string)} disabled={loadingOptions}>
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
              value={classId}
              onValueChange={(v) => {
                setClassId(v as string);
                setSectionId("");
              }}
              disabled={loadingOptions}
            >
              <SelectTrigger id="class" className="w-full">
                <SelectValue placeholder="Select class" />
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
