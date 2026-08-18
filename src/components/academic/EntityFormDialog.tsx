"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
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

export type EntityFieldOption = { value: string; label: string };

export type EntityField = {
  name: string;
  label: string;
  type: "text" | "date" | "select";
  options?: EntityFieldOption[];
  // Populated client-side when the dialog opens, e.g. "/api/sessions" for a Class's
  // session picker. Expects the endpoint's array response shape from Task 4's
  // crud-factory (`{ id, name, ... }[]`) — id becomes the option value, name the label.
  optionsUrl?: string;
  required?: boolean;
};

interface EntityFormDialogProps {
  title: string;
  fields: EntityField[];
  postUrl: string;
  onCreated: () => void;
  trigger?: ReactElement;
}

export function EntityFormDialog({
  title,
  fields,
  postUrl,
  onCreated,
  trigger,
}: EntityFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, EntityFieldOption[]>>({});
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Keep a ref to the latest `fields` so the open-effect below doesn't need `fields`
  // in its dependency array — pages typically pass an inline array literal, which
  // would otherwise get a new reference on every render and re-trigger the fetch
  // (and wipe in-progress input) on every keystroke.
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  useEffect(() => {
    if (!open) return;
    setValues({});
    const urlFields = fieldsRef.current.filter((f) => f.optionsUrl);
    if (urlFields.length === 0) return;

    setLoadingOptions(true);
    Promise.all(
      urlFields.map((f) =>
        fetch(f.optionsUrl!)
          .then((res) => (res.ok ? res.json() : []))
          .then(
            (data) =>
              [
                f.name,
                Array.isArray(data)
                  ? data.map((d: { id: string; name: string }) => ({
                      value: d.id,
                      label: d.name,
                    }))
                  : [],
              ] as const
          )
      )
    )
      .then((entries) => setDynamicOptions(Object.fromEntries(entries)))
      .finally(() => setLoadingOptions(false));
  }, [open]);

  const handleChange = (name: string, value: string) =>
    setValues((v) => ({ ...v, [name]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const missing = fields.filter((f) => (f.required ?? true) && !values[f.name]);
    if (missing.length > 0) {
      toast.add({
        title: "Missing information",
        description: `Please fill in: ${missing.map((f) => f.label).join(", ")}`,
        type: "warning",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        throw new Error(
          res.status === 400 ? "Please check the highlighted fields." : "Could not save record."
        );
      }
      toast.add({
        title: "Saved",
        description: `${title} created successfully.`,
        type: "success",
      });
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.add({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Could not save record.",
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
              Add
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Fill in the details below.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => {
            const options = field.optionsUrl
              ? dynamicOptions[field.name] ?? []
              : field.options ?? [];
            return (
              <div key={field.name} className="space-y-1.5">
                <Label htmlFor={field.name}>{field.label}</Label>
                {field.type === "select" ? (
                  <Select
                    items={options.map((o) => ({ value: o.value, label: o.label }))}
                    value={values[field.name] ?? ""}
                    onValueChange={(v) => handleChange(field.name, v as string)}
                    disabled={field.optionsUrl ? loadingOptions : false}
                  >
                    <SelectTrigger id={field.name} className="w-full">
                      <SelectValue
                        placeholder={
                          field.optionsUrl && loadingOptions
                            ? "Loading…"
                            : `Select ${field.label.toLowerCase()}`
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((o) => (
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
                    required={field.required ?? true}
                    value={values[field.name] ?? ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                  />
                )}
              </div>
            );
          })}
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
