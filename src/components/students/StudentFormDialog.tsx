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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { Plus } from "lucide-react";

// Field list matches studentCreateSchema (src/lib/validation/student.ts) exactly:
// admissionNumber, fullName, gender (enum), dob (date), then a set of optional
// free-text fields. type="date" renders as a plain shadcn Input per the brief
// (no dedicated date-picker component exists in this codebase yet).
const FIELDS: { name: string; label: string; type: "text" | "date" | "select"; required: boolean }[] = [
  { name: "admissionNumber", label: "Admission Number", type: "text", required: true },
  { name: "fullName", label: "Full Name", type: "text", required: true },
  { name: "gender", label: "Gender", type: "select", required: true },
  { name: "dob", label: "Date of Birth", type: "date", required: true },
  { name: "cnicOrBForm", label: "CNIC / B-Form", type: "text", required: false },
  { name: "bloodGroup", label: "Blood Group", type: "text", required: false },
  { name: "phone", label: "Phone", type: "text", required: false },
  { name: "address", label: "Address", type: "text", required: false },
  { name: "previousSchool", label: "Previous School", type: "text", required: false },
];

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];

interface StudentFormDialogProps {
  onCreated: () => void;
  trigger?: ReactElement;
}

export function StudentFormDialog({ onCreated, trigger }: StudentFormDialogProps) {
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
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.status === 400) {
        const body = await res.json();
        // crud-factory's validateOrThrow throws zod's .flatten() shape:
        // { fieldErrors: { fieldName: [messages] }, formErrors: [...] }
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
        setFieldErrors({ admissionNumber: [body.error ?? "Admission number already exists"] });
        toast.add({
          title: "Duplicate admission number",
          description: body.error ?? "Admission number already exists.",
          type: "error",
        });
        return;
      }

      if (!res.ok) {
        throw new Error("Could not save student.");
      }

      toast.add({
        title: "Saved",
        description: "Student created successfully.",
        type: "success",
      });
      resetAndClose();
      onCreated();
    } catch (err) {
      toast.add({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Could not save student.",
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
              Add Student
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Student</DialogTitle>
          <DialogDescription>Fill in the student&apos;s details below.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {FIELDS.map((field) => {
            const errors = fieldErrors[field.name];
            return (
              <div key={field.name} className="space-y-1.5">
                <Label htmlFor={field.name}>{field.label}</Label>
                {field.type === "select" ? (
                  <Select
                    items={GENDER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                    value={values[field.name] ?? ""}
                    onValueChange={(v) => handleChange(field.name, v as string)}
                  >
                    <SelectTrigger
                      id={field.name}
                      className="w-full"
                      aria-invalid={errors && errors.length > 0}
                    >
                      <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={field.name}
                    type={field.type}
                    required={field.required}
                    value={values[field.name] ?? ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    aria-invalid={errors && errors.length > 0}
                  />
                )}
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
