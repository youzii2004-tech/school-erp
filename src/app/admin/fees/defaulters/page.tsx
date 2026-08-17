"use client";

import { useEffect, useState } from "react";
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
import { Inbox, Eye } from "lucide-react";
import { VoucherStatusBadge } from "@/components/fees/VoucherPrintView";

// Matches GET /api/fee-vouchers (Task 12) — plain FeeVoucher rows with `student`
// included.
type VoucherRow = {
  id: string;
  voucherNumber: string;
  dueDate: string;
  totalPayable: number;
  paidAmount: number;
  status: string;
  student: { id: string; fullName: string; admissionNumber: string };
};

function formatMoney(amount: number) {
  return `Rs. ${amount.toFixed(2)}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function DefaultersPage() {
  const [vouchers, setVouchers] = useState<VoucherRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setVouchers(null);
    setError(null);

    // No single query param covers both statuses (GET /api/fee-vouchers, Task 12,
    // only accepts one `status` value at a time) — fetch UNPAID and PARTIALLY_PAID
    // separately and merge client-side.
    Promise.all([
      fetch("/api/fee-vouchers?status=UNPAID").then((res) => (res.ok ? res.json() : [])),
      fetch("/api/fee-vouchers?status=PARTIALLY_PAID").then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([unpaid, partiallyPaid]) => {
        if (cancelled) return;
        const merged: VoucherRow[] = [...(unpaid ?? []), ...(partiallyPaid ?? [])];
        merged.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        setVouchers(merged);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load defaulters");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Defaulter Report</h1>
          <p className="text-sm text-muted-foreground">
            Unpaid and partially paid vouchers, sorted by due date.
          </p>
        </div>
        {/* Task 30 wires in the shared CSV export utility here — no export button
            until that utility exists per the ruling in the Task 13 brief. */}
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
      ) : vouchers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Inbox className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No outstanding vouchers</p>
            <p className="text-xs text-muted-foreground">Every voucher is fully paid.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voucher #</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Total Payable</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vouchers.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.voucherNumber}</TableCell>
                  <TableCell>
                    {v.student.fullName}
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      ({v.student.admissionNumber})
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(v.dueDate)}</TableCell>
                  <TableCell>{formatMoney(v.totalPayable)}</TableCell>
                  <TableCell>{formatMoney(v.paidAmount)}</TableCell>
                  <TableCell className="font-medium">{formatMoney(v.totalPayable - v.paidAmount)}</TableCell>
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
