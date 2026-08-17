"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { ArrowLeft, Upload, FileSpreadsheet } from "lucide-react";

type StudentRow = {
  admissionNumber: string;
  fullName: string;
  gender: string;
  dob: string;
};

type ParseError = { row: number; message: string };
type DuplicateEntry = {
  admissionNumber: string;
  validRowIndex: number;
  reason: "duplicate within file" | "already exists in database";
};

type Preview = {
  valid: StudentRow[];
  errors: ParseError[];
  duplicates: DuplicateEntry[];
};

// Task 24: file picker -> Preview (no writes) -> Confirm Import (?commit=true).
// Mirrors the promotion flow's confirm-before-write pattern (see
// src/app/admin/promotions/page.tsx): nothing is written to the DB until the
// admin has seen the exact rows that will be created, plus every parse error
// and duplicate that will be skipped.
export default function ImportStudentsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<number | null>(null);

  async function runPreview() {
    if (!file) return;
    setPreviewing(true);
    setImported(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/students/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not preview file");
      setPreview(data);
    } catch (e) {
      toast.add({
        title: "Preview failed",
        description: e instanceof Error ? e.message : "Could not preview file",
        type: "error",
      });
      setPreview(null);
    } finally {
      setPreviewing(false);
    }
  }

  async function runCommit() {
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/students/import?commit=true", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not import students");
      setImported(data.imported ?? 0);
      setPreview(data);
      toast.add({
        title: "Import complete",
        description: `${data.imported ?? 0} student(s) imported.`,
        type: "success",
      });
    } catch (e) {
      toast.add({
        title: "Import failed",
        description: e instanceof Error ? e.message : "Could not import students",
        type: "error",
      });
    } finally {
      setImporting(false);
    }
  }

  function handleFileChange(f: File | null) {
    setFile(f);
    setPreview(null);
    setImported(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Import Students</h1>
          <p className="text-sm text-muted-foreground">
            Upload a CSV or Excel file to bulk-add students. Nothing is saved until you confirm.
          </p>
        </div>
        <Button variant="outline" size="sm" render={<Link href="/admin/students" />}>
          <ArrowLeft />
          Back to Students
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="size-6 text-muted-foreground" />
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="text-sm"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                Columns: admissionNumber, fullName, gender (MALE/FEMALE/OTHER), dob, and optional
                cnicOrBForm, bloodGroup, phone, address, previousSchool.
              </p>
            </div>
          </div>
          <Button onClick={runPreview} disabled={!file || previewing}>
            <Upload />
            {previewing ? "Previewing…" : "Preview"}
          </Button>
        </CardContent>
      </Card>

      {preview && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">{preview.valid.length} valid</Badge>
            <Badge variant="destructive">{preview.errors.length} errors</Badge>
            <Badge variant="outline">{preview.duplicates.length} duplicates</Badge>
            {imported !== null && <Badge variant="default">{imported} imported</Badge>}
          </div>

          <Card className="py-0">
            <CardContent className="p-4">
              <h2 className="mb-2 text-sm font-semibold">Rows to import ({preview.valid.length})</h2>
              {preview.valid.length === 0 ? (
                <p className="text-sm text-muted-foreground">No valid rows in this file.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Admission #</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>DOB</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.valid.map((row, i) => (
                      <TableRow key={`${row.admissionNumber}-${i}`}>
                        <TableCell>{row.admissionNumber}</TableCell>
                        <TableCell>{row.fullName}</TableCell>
                        <TableCell>{row.gender}</TableCell>
                        <TableCell>{String(row.dob).slice(0, 10)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {preview.errors.length > 0 && (
            <Card className="py-0">
              <CardContent className="p-4">
                <h2 className="mb-2 text-sm font-semibold text-destructive">
                  Errors ({preview.errors.length})
                </h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Row</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.errors.map((err, i) => (
                      <TableRow key={i}>
                        <TableCell>{err.row}</TableCell>
                        <TableCell className="text-muted-foreground">{err.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {preview.duplicates.length > 0 && (
            <Card className="py-0">
              <CardContent className="p-4">
                <h2 className="mb-2 text-sm font-semibold">Duplicates ({preview.duplicates.length})</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Admission #</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.duplicates.map((dup, i) => (
                      <TableRow key={i}>
                        <TableCell>{dup.admissionNumber}</TableCell>
                        <TableCell className="text-muted-foreground">{dup.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button onClick={runCommit} disabled={preview.valid.length === 0 || importing || imported !== null}>
              {importing ? "Importing…" : "Confirm Import"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
