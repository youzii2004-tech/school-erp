export type VoucherStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";

export function computeVoucherStatus(totalPayable: number, paidAmount: number): VoucherStatus {
  if (paidAmount >= totalPayable) return "PAID";
  if (paidAmount > 0) return "PARTIALLY_PAID";
  return "UNPAID";
}

export function nextVoucherNumber(lastNumber: string | null): string {
  if (!lastNumber) return "VCH-000001";
  const n = parseInt(lastNumber.split("-")[1], 10) + 1;
  return `VCH-${String(n).padStart(6, "0")}`;
}
