"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { Inbox, Search, Eye, Plus } from "lucide-react";
import { VoucherStatusBadge } from "@/components/fees/VoucherPrintView";

// Matches GET /api/fee-vouchers (Task 12, src/app/api/fee-vouchers/route.ts) — plain
// FeeVoucher rows with `student` included.
type VoucherRow = {
  id: string;
  voucherNumber: string;
  billingMonth: string;
  totalPayable: number;
  status: string;
  student: { id: string; fullName: string };
};

type Student = { id: string; fullName: string; admissionNumber: string };
type AcademicSession = { id: string; name: string; isCurrent: boolean };

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "UNPAID", label: "Unpaid" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" },
];

function formatMoney(amount: number) {
  return `Rs. ${amount.toFixed(2)}`;
}

// Inline dialog rather than the generic EntityFormDialog (src/components/academic/
// EntityFormDialog.tsx): it needs a client-side searchable student picker (there's
// no dedicated student-search endpoint per Task 13 brief — GET /api/students is
// fetched once and filtered locally, same pattern as LinkGuardianDialog in
// StudentProfileTabs.tsx) plus a session default-to-current, neither of which the
// generic dialog's plain optionsUrl->dropdown mapping supports.
function GenerateVoucherDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentId, setStudentId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [billingMonth, setBillingMonth] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [discount, setDiscount] = useState("0");
  const [fine, setFine] = useState("0");

  useEffect(() => {
    if (!open) return;
    setStudentQuery("");
    setStudentId("");
    setSessionId("");
    setBillingMonth("");
    setDueDate("");
    setDiscount("0");
    setFine("0");

    setLoadingOptions(true);
    Promise.all([
      fetch("/api/students").then((res) => (res.ok ? res.json() : [])),
      fetch("/api/sessions").then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([studentData, sessionData]) => {
        setStudents(Array.isArray(studentData) ? studentData : []);
        const sessionList: AcademicSession[] = Array.isArray(sessionData) ? sessionData : [];
        setSessions(sessionList);
        const current = sessionList.find((s) => s.isCurrent);
        if (current) setSessionId(current.id);
      })
      .finally(() => setLoadingOptions(false));
  }, [open]);

  const filteredStudents = students.filter((s) => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return true;
    return s.fullName.toLowerCase().includes(q) || s.admissionNumber.toLowerCase().includes(q);
  });

  const selectedStudent = students.find((s) => s.id === studentId) ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentId || !sessionId || !billingMonth || !dueDate) {
      toast.add({
        title: "Missing information",
        description: "Please select a student, session, billing month and due date.",
        type: "warning",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/fee-vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          academicSessionId: sessionId,
          billingMonth,
          dueDate,
          discount: discount || 0,
          fine: fine || 0,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          res.status === 400
            ? body?.error?.[0]?.message ?? "Please check the highlighted fields."
            : body?.error ?? "Could not generate voucher."
        );
      }
      toast.add({ title: "Voucher generated", description: "The fee voucher has been created.", type: "success" });
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.add({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Could not generate voucher.",
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
          <Button>
            <Plus />
            Generate Voucher
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Voucher</DialogTitle>
          <DialogDescription>
            Charges are pulled from the student&apos;s class fee structure automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="student-search">Student</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="student-search"
                placeholder={selectedStudent ? selectedStudent.fullName : "Search by name or admission number…"}
                value={studentQuery}
                onChange={(e) => {
                  setStudentQuery(e.target.value);
                  setStudentId("");
                }}
                className="pl-8"
                disabled={loadingOptions}
              />
            </div>
            {studentQuery && !studentId && (
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-1">
                {filteredStudents.length === 0 ? (
                  <p className="px-2 py-2 text-sm text-muted-foreground">No students match.</p>
                ) : (
                  filteredStudents.slice(0, 20).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setStudentId(s.id);
                        setStudentQuery("");
                      }}
                      className="flex w-full flex-col rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      <span className="font-medium">{s.fullName}</span>
                      <span className="text-xs text-muted-foreground">{s.admissionNumber}</span>
                    </button>
                  ))
                )}
              </div>
            )}
            {selectedStudent && (
              <p className="text-xs text-muted-foreground">
                Selected: {selectedStudent.fullName} ({selectedStudent.admissionNumber})
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="session">Session</Label>
            <Select value={sessionId} onValueChange={(v) => setSessionId(v as string)} disabled={loadingOptions}>
              <SelectTrigger id="session" className="w-full">
                <SelectValue placeholder="Select session" />
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="billingMonth">Billing Month</Label>
              <Input
                id="billingMonth"
                type="month"
                required
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input id="dueDate" type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="discount">Discount</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fine">Fine</Label>
              <Input
                id="fine"
                type="number"
                min="0"
                step="0.01"
                value={fine}
                onChange={(e) => setFine(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !studentId}>
              {submitting ? "Generating…" : "Generate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function FeeVouchersPage() {
  const [status, setStatus] = useState("ALL");
  const [query, setQuery] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);
  const [vouchers, setVouchers] = useState<VoucherRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setVouchers(null);
    setError(null);

    const url = status === "ALL" ? "/api/fee-vouchers" : `/api/fee-vouchers?status=${status}`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load vouchers");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setVouchers(Array.isArray(data) ? data : []);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load vouchers");
      });

    return () => {
      cancelled = true;
    };
  }, [status, refreshCount]);

  // GET /api/fee-vouchers (Task 12) supports studentId/status filters only, no
  // student-name search param — filtered client-side over the already-fetched page,
  // same lightweight-search convention used elsewhere in this app (e.g. the student
  // picker above, LinkGuardianDialog in StudentProfileTabs.tsx).
  const filteredVouchers = (vouchers ?? []).filter((v) => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return true;
    return v.student.fullName.toLowerCase().includes(q) || v.voucherNumber.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Fee Vouchers</h1>
          <p className="text-sm text-muted-foreground">Generate, view and track student fee vouchers.</p>
        </div>
        <GenerateVoucherDialog onCreated={() => setRefreshCount((c) => c + 1)} />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by student or voucher #…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus((v as string) ?? "ALL")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-10 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground">Try refreshing the page.</p>
          </CardContent>
        </Card>
      ) : vouchers === null ? (
        <Card>
          <CardContent className="space-y-3 pt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : filteredVouchers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Inbox className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No vouchers found</p>
            <p className="text-xs text-muted-foreground">
              {debouncedQuery || status !== "ALL"
                ? "Try a different search or status filter."
                : "Vouchers you generate will show up here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voucher #</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Billing Month</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVouchers.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.voucherNumber}</TableCell>
                  <TableCell>{v.student.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">{v.billingMonth}</TableCell>
                  <TableCell>{formatMoney(v.totalPayable)}</TableCell>
                  <TableCell>
                    <VoucherStatusBadge status={v.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link href={`/admin/fees/vouchers/${v.id}`} />}
                    >
                      <Eye />
                      View
                    </Button>
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
