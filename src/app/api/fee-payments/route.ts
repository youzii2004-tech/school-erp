import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { feePaymentSchema } from "@/lib/validation/fee";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";
import { computeVoucherStatus } from "@/lib/fee-calc";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validateOrThrow(feePaymentSchema, await req.json());

    const result = await prisma.$transaction(async (tx) => {
      const voucher = await tx.feeVoucher.findUnique({ where: { id: body.voucherId } });
      if (!voucher || voucher.deletedAt) throw new Error("VOUCHER_NOT_FOUND");
      if (voucher.status === "CANCELLED") throw new Error("VOUCHER_CANCELLED");

      const payment = await tx.feePayment.create({
        data: { ...body, recordedById: session!.user.id },
      });
      // atomic increment (not a read-then-write of a JS-computed value) so two
      // concurrent payments against the same voucher can't lose an update
      const incremented = await tx.feeVoucher.update({
        where: { id: voucher.id },
        data: { paidAmount: { increment: body.amount } },
      });
      const updatedVoucher = await tx.feeVoucher.update({
        where: { id: voucher.id },
        data: { status: computeVoucherStatus(incremented.totalPayable, incremented.paidAmount) },
      });
      return { payment, voucher: updatedVoucher };
    });

    await audit({ id: session!.user.id, name: session!.user.name }, "payment.create", "FeePayment", result.payment.id, { voucherId: body.voucherId, amount: body.amount, method: body.method });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    if ((e as Error).message === "VOUCHER_NOT_FOUND") return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    if ((e as Error).message === "VOUCHER_CANCELLED") return NextResponse.json({ error: "Cannot pay a cancelled voucher" }, { status: 409 });
    return NextResponse.json({ error: "Could not record payment" }, { status: 500 });
  }
}
