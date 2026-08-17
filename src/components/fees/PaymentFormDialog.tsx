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
import { CircleDollarSign } from "lucide-react";

// Mirrors feePaymentSchema (src/lib/validation/fee.ts) / PaymentMethod enum
// (prisma/schema.prisma).
type PaymentMethod = "CASH" | "BANK_TRANSFER" | "ONLINE" | "CHEQUE";

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "ONLINE", label: "Online" },
  { value: "CHEQUE", label: "Cheque" },
];

// Cash payments don't carry a reference; the other three methods do (bank slip #,
// transaction id, cheque #).
const REFERENCE_METHODS = new Set<PaymentMethod>(["BANK_TRANSFER", "ONLINE", "CHEQUE"]);

interface PaymentFormDialogProps {
  voucherId: string;
  onRecorded: () => void;
  trigger?: ReactElement;
}

export function PaymentFormDialog({ voucherId, onRecorded, trigger }: PaymentFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setMethod("CASH");
    setReference("");
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = Number(amount);
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.add({
        title: "Missing information",
        description: "Please enter a valid payment amount.",
        type: "warning",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/fee-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voucherId,
          amount: parsedAmount,
          method,
          reference: REFERENCE_METHODS.has(method) && reference ? reference : undefined,
        }),
      });

      if (res.status === 409) {
        const body = await res.json();
        toast.add({
          title: "Cannot record payment",
          description: body.error ?? "This voucher can no longer accept payments.",
          type: "error",
        });
        return;
      }
      if (!res.ok) {
        throw new Error(
          res.status === 400 ? "Please check the highlighted fields." : "Could not record payment."
        );
      }

      toast.add({ title: "Payment recorded", description: "The voucher has been updated.", type: "success" });
      setOpen(false);
      onRecorded();
    } catch (err) {
      toast.add({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Could not record payment.",
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
              <CircleDollarSign />
              Record Payment
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>Log a payment made against this voucher.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="method">Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger id="method" className="w-full">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {METHOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {REFERENCE_METHODS.has(method) && (
            <div className="space-y-1.5">
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                placeholder="Transaction / cheque / slip number"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Recording…" : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
