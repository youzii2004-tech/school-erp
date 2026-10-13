import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { VoucherStatus } from "@prisma/client";
import { feeVoucherCreateSchema } from "@/lib/validation/fee";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";
import { computeVoucherStatus, nextVoucherNumber } from "@/lib/fee-calc";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const studentId = req.nextUrl.searchParams.get("studentId") ?? undefined;
  const status = req.nextUrl.searchParams.get("status") ?? undefined;

  let studentIdFilter: string | { in: string[] } | undefined = studentId;

  if (session.user.role === "STUDENT") {
    // A STUDENT may only ever see their own vouchers. Resolve their own studentId
    // server-side and ignore/override any studentId query param that doesn't match.
    const own = await prisma.student.findUnique({ where: { userId: session.user.id } });
    if (!own) return NextResponse.json([]);
    if (studentId && studentId !== own.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    studentIdFilter = own.id;
  } else if (session.user.role === "PARENT") {
    // A PARENT may only see vouchers for students they are linked to via GuardianLink.
    const links = await prisma.guardianLink.findMany({
      where: { userId: session.user.id },
      select: { studentId: true },
    });
    const linkedIds = links.map((l) => l.studentId);
    if (linkedIds.length === 0) return NextResponse.json([]);

    if (studentId) {
      if (!linkedIds.includes(studentId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      studentIdFilter = studentId;
    } else {
      // No specific studentId requested: return vouchers for all linked students.
      studentIdFilter = { in: linkedIds };
    }
  }

  const vouchers = await prisma.feeVoucher.findMany({
    where: {
      deletedAt: null,
      ...(studentIdFilter ? { studentId: studentIdFilter } : {}),
      ...(status ? { status: status as VoucherStatus } : {}),
    },
    include: { student: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(vouchers);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validateOrThrow(feeVoucherCreateSchema, await req.json());

    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_academicSessionId: { studentId: body.studentId, academicSessionId: body.academicSessionId } },
    });
    if (!enrollment) return NextResponse.json({ error: "Student has no enrollment in this session" }, { status: 400 });

    const structures = await prisma.feeStructure.findMany({ where: { classId: enrollment.classId, deletedAt: null } });
    const breakdown = structures.map((s) => ({ category: s.category, amount: s.amount }));
    const subtotal = breakdown.reduce((sum, b) => sum + b.amount, 0);

    const lastVoucher = await prisma.feeVoucher.findFirst({ orderBy: { createdAt: "desc" } });
    const voucherNumber = nextVoucherNumber(lastVoucher?.voucherNumber ?? null);
    const totalPayable = subtotal + body.fine - body.discount;

    const voucher = await prisma.feeVoucher.create({
      data: {
        voucherNumber,
        studentId: body.studentId,
        academicSessionId: body.academicSessionId,
        billingMonth: body.billingMonth,
        dueDate: body.dueDate,
        breakdown: JSON.stringify(breakdown),
        discount: body.discount,
        fine: body.fine,
        totalPayable,
        status: computeVoucherStatus(totalPayable, 0),
      },
    });
    await audit({ id: session!.user.id, name: session!.user.name }, "voucher.create", "FeeVoucher", voucher.id, { voucherNumber, totalPayable });
    return NextResponse.json(voucher, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: "Could not generate voucher" }, { status: 500 });
  }
}
