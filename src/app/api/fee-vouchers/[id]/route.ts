import { NextRequest, NextResponse } from "next/server";
import { requireRole, getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const voucher = await prisma.feeVoucher.findUnique({
    where: { id },
    include: { student: true, payments: true },
  });
  if (!voucher || voucher.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "STUDENT" && voucher.student.userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (session.user.role === "PARENT") {
    const linked = await prisma.guardianLink.findFirst({
      where: { studentId: voucher.studentId, userId: session.user.id },
    });
    if (!linked) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(voucher);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (body?.status !== "CANCELLED") {
    return NextResponse.json({ error: "Only status: CANCELLED is allowed via this endpoint" }, { status: 400 });
  }

  const voucher = await prisma.feeVoucher.findUnique({ where: { id } });
  if (!voucher || voucher.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.feeVoucher.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  await audit({ id: session!.user.id, name: session!.user.name }, "voucher.cancel", "FeeVoucher", id, { voucherNumber: voucher.voucherNumber, paidAmount: voucher.paidAmount });
  return NextResponse.json(updated);
}
