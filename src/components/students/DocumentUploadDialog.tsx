"use client";

import { useState } from "react";
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

// Kept in sync with ALLOWED_TYPES in src/app/api/upload/route.ts and the
// `type` comment on the Document model in prisma/schema.prisma.
const DOCUMENT_TYPES = [
  { value: "BIRTH_CERT", label: "Birth Certificate" },
  { value: "CNIC", label: "CNIC / B-Form" },
  { value: "PREVIOUS_CERT", label: "Previous School Certificate" },
  { value: "PHOTO", label: "Photo" },
  { value: "LEAVING_CERT", label: "Leaving Certificate" },
  { value: "OTHER", label: "Other" },
];

interface DocumentUploadDialogProps {
  studentId: string;
  onUploaded: () => void;
}

export function DocumentUploadDialog({ studentId, onUploaded }: DocumentUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setType("");
    setFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!type || !file) {
      toast.add({
        title: "Missing information",
        description: "Please select a document type and choose a file.",
        type: "warning",
      });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("studentId", studentId);
      formData.append("type", type);
      formData.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not upload document.");
      }

      toast.add({ title: "Uploaded", description: "Document uploaded successfully.", type: "success" });
      setOpen(false);
      reset();
      onUploaded();
    } catch (err) {
      toast.add({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Could not upload document.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button>
            <Plus />
            New Document
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>Attach a document to this student&apos;s profile (max 5MB).</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="doc-type">Document Type</Label>
            <Select
              items={DOCUMENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              value={type}
              onValueChange={(v) => setType(v as string)}
            >
              <SelectTrigger id="doc-type" className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-file">File</Label>
            <Input
              id="doc-file"
              type="file"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
