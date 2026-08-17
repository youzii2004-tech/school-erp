"use client";

import { useState, type ReactElement } from "react";
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
import { toast } from "@/components/ui/toast";
import { Plus } from "lucide-react";

// Field list matches teacherCreateSchema (src/lib/validation/teacher.ts) exactly.
// type="date" renders as a plain shadcn Input, same convention as
// StudentFormDialog (no dedicated date-picker component exists in this codebase).
const FIELDS: { name: string; label: string; type: "text" | "email" | "password" | "date"; required: boolean }[] = [
  { name: "fullName", label: "Full Name", type: "text", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "username", label: "Username", type: "text", required: true },
  { name: "password", label: "Password", type: "password", required: true },
  { name: "cnic", label: "CNIC", type: "text", required: false },
  { name: "qualification", label: "Qualification", type: "text", required: false },
  { name: "joiningDate", label: "Joining Date", type: "date", required: false },
  { name: "designation", label: "Designation", type: "text", required: false },
  { name: "phone", label: "Phone", type: "text", required: false },
];

interface TeacherFormDialogProps {
  onCreated: () => void;
  trigger?: ReactElement;
}

export function TeacherFormDialog({ onCreated, trigger }: TeacherFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (name: string, value: string) => {
    setValues((v) => ({ ...v, [name]: value }));
    setFieldErrors((e) => (e[name] ? { ...e, [name]: [] } : e));
  };

  const resetAndClose = () => {
    setValues({});
    setFieldErrors({});
    setOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const missing = FIELDS.filter((f) => f.required && !values[f.name]);
    if (missing.length > 0) {
      toast.add({
        title: "Missing information",
        description: `Please fill in: ${missing.map((f) => f.label).join(", ")}`,
        type: "warning",
      });
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.status === 400) {
        const body = await res.json();
        const flat = body.error as { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
        setFieldErrors(flat.fieldErrors ?? {});
        toast.add({
          title: "Please check the highlighted fields",
          description: flat.formErrors?.join(" ") || "Some fields need attention.",
          type: "warning",
        });
        return;
      }

      if (res.status === 409) {
        const body = await res.json();
        toast.add({
          title: "Already in use",
          description: body.error ?? "Email or username already in use.",
          type: "error",
        });
        return;
      }

      if (!res.ok) {
        throw new Error("Could not save teacher.");
      }

      toast.add({
        title: "Saved",
        description: "Teacher created successfully.",
        type: "success",
      });
      resetAndClose();
      onCreated();
    } catch (err) {
      toast.add({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Could not save teacher.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setValues({});
          setFieldErrors({});
        }
      }}
    >
      <DialogTrigger
        render={
          trigger ?? (
            <Button>
              <Plus />
              Add Teacher
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Teacher</DialogTitle>
          <DialogDescription>
            Creates a portal login for this teacher along with their profile.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {FIELDS.map((field) => {
            const errors = fieldErrors[field.name];
            return (
              <div key={field.name} className="space-y-1.5">
                <Label htmlFor={field.name}>{field.label}</Label>
                <Input
                  id={field.name}
                  type={field.type}
                  required={field.required}
                  value={values[field.name] ?? ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  aria-invalid={errors && errors.length > 0}
                />
                {errors && errors.length > 0 && (
                  <p className="text-xs text-destructive">{errors.join(" ")}</p>
                )}
              </div>
            );
          })}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetAndClose}>
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
