"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { VoucherPrintView, type VoucherDetail } from "@/components/fees/VoucherPrintView";
import { PaymentFormDialog } from "@/components/fees/PaymentFormDialog";

export default function VoucherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [voucher, setVoucher] = useState<VoucherDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    fetch(`/api/fee-vouchers/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Voucher not found" : "Failed to load voucher");
        return res.json();
      })
      .then(setVoucher)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load voucher"));
  }, [id]);

  useEffect(() => {
    setVoucher(null);
    load();
  }, [load]);

  const canRecordPayment = voucher !== null && voucher.status !== "PAID" && voucher.status !== "CANCELLED";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Button variant="ghost" size="sm" render={<Link href="/admin/fees/vouchers" />}>
          <ArrowLeft />
          Back to Vouchers
        </Button>
        {canRecordPayment && (
          <PaymentFormDialog voucherId={voucher.id} onRecorded={load} />
        )}
      </div>

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-10 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : voucher === null ? (
        <Card>
          <CardContent className="space-y-3 pt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <VoucherPrintView voucher={voucher} />
      )}
    </div>
  );
}
