"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, School } from "lucide-react";
import { cn } from "@/lib/utils";

// Matches GET /api/fee-vouchers/[id] (Task 12, src/app/api/fee-vouchers/[id]/route.ts):
// a plain FeeVoucher row (prisma/schema.prisma model FeeVoucher) with `student` and
// `payments` included. `breakdown` is JSON-encoded on the row — parsed below.
export type VoucherPayment = {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  paidAt: string;
};

export type VoucherDetail = {
  id: string;
  voucherNumber: string;
  billingMonth: string;
  dueDate: string;
  breakdown: string;
  previousBalance: number;
  discount: number;
  fine: number;
  totalPayable: number;
  paidAmount: number;
  status: string;
  student: { id: string; fullName: string; admissionNumber: string };
  payments: VoucherPayment[];
};

// Same semantic-token convention as StudentProfileTabs' ATTENDANCE_STATUS_CLASS:
// PAID/PARTIALLY_PAID/OVERDUE get a meaningful color, UNPAID/CANCELLED stay neutral
// (an unpaid-but-not-yet-due voucher isn't a problem yet — only OVERDUE is
// destructive-red; the defaulter report is what surfaces UNPAID + PARTIALLY_PAID
// together as needing attention).
export const VOUCHER_STATUS_CLASS: Record<string, string> = {
  PAID: "bg-success/10 text-success",
  PARTIALLY_PAID: "bg-warning/10 text-warning",
  OVERDUE: "bg-destructive/10 text-destructive",
  UNPAID: "bg-muted text-muted-foreground",
  CANCELLED: "bg-muted text-muted-foreground",
};

export function VoucherStatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn("border-0", VOUCHER_STATUS_CLASS[status] ?? "bg-muted text-muted-foreground")} variant="outline">
      {status.replace("_", " ")}
    </Badge>
  );
}

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

function parseBreakdown(raw: string): { category: string; amount: number }[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function VoucherPrintView({ voucher }: { voucher: VoucherDetail }) {
  const breakdown = parseBreakdown(voucher.breakdown);
  const subtotal = breakdown.reduce((sum, b) => sum + b.amount, 0);
  const remaining = Math.max(voucher.totalPayable - voucher.paidAmount, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-end print:hidden">
        <Button type="button" variant="outline" onClick={() => window.print()}>
          <Printer />
          Print
        </Button>
      </div>

      {/* A4-proportioned card: 210:297 ratio, capped so it stays readable on screen
          and prints as close to a real A4 page as browser print-to-PDF allows. */}
      <Card className="mx-auto w-full max-w-[210mm] min-h-[297mm] print:border-0 print:shadow-none">
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              {/* Logo placeholder — no institute branding asset exists yet. */}
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <School className="size-6" />
              </div>
              <div>
                <p className="font-heading text-lg font-semibold">School ERP</p>
                <p className="text-xs text-muted-foreground">Fee Voucher</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-heading text-lg font-semibold">{voucher.voucherNumber}</p>
              <VoucherStatusBadge status={voucher.status} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Student</p>
              <p className="text-sm font-medium">{voucher.student.fullName}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Admission #</p>
              <p className="text-sm font-medium">{voucher.student.admissionNumber}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Billing Month</p>
              <p className="text-sm font-medium">{voucher.billingMonth}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Due Date</p>
              <p className="text-sm font-medium">{formatDate(voucher.dueDate)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Charges</p>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Category</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-3 py-4 text-center text-muted-foreground">
                        No charges on this voucher.
                      </td>
                    </tr>
                  ) : (
                    breakdown.map((b, i) => (
                      <tr key={`${b.category}-${i}`} className="border-t border-border">
                        <td className="px-3 py-2">{b.category}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(b.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Previous Balance</span>
              <span>{formatMoney(voucher.previousBalance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span>-{formatMoney(voucher.discount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fine</span>
              <span>{formatMoney(voucher.fine)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
              <span>Total Payable</span>
              <span>{formatMoney(voucher.totalPayable)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span>{formatMoney(voucher.paidAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold text-primary">
              <span>Remaining</span>
              <span>{formatMoney(remaining)}</span>
            </div>
          </div>

          {voucher.payments.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Payment History</p>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Method</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Reference</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voucher.payments.map((p) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="px-3 py-2">{formatDate(p.paidAt)}</td>
                        <td className="px-3 py-2">{p.method.replace("_", " ")}</td>
                        <td className="px-3 py-2">{p.reference || "—"}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
