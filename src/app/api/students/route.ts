import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { studentCreateSchema } from "@/lib/validation/student";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

// Task 22 addition: the student/parent dashboards need to discover "which
// student(s) am I" before they can call any of the ownership-scoped detail
// endpoints (GET /api/attendance/summary?studentId=, /api/fee-vouchers?studentId=,
// /api/students/[id]) — no endpoint previously exposed this. Every other
// role-scoped GET in this app (fee-vouchers, results, exams) resolves the
// caller's own studentId / linked studentIds server-side from session.user.id
// and never leaks the raw GuardianLink rows to the client; this follows the
// same pattern rather than adding a new route. ADMIN/TEACHER behavior below
// is unchanged.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role === "STUDENT") {
    const own = await prisma.student.findUnique({ where: { userId: session.user.id } });
    return NextResponse.json(own && !own.deletedAt ? [own] : []);
  }
  if (session.user.role === "PARENT") {
    const links = await prisma.guardianLink.findMany({ where: { userId: session.user.id } });
    const studentIds = [...new Set(links.map((l) => l.studentId))];
    if (studentIds.length === 0) return NextResponse.json([]);
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, deletedAt: null },
      orderBy: { fullName: "asc" },
    });
    return NextResponse.json(students);
  }

  if (!requireRole(session, ["ADMIN", "TEACHER"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const students = await prisma.student.findMany({
    where: {
      deletedAt: null,
      ...(q ? { OR: [{ fullName: { contains: q } }, { admissionNumber: { contains: q } }] } : {}),
    },
    orderBy: { fullName: "asc" },
    include: {
      enrollments: {
        include: { class: true, section: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  return NextResponse.json(students);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validateOrThrow(studentCreateSchema, await req.json());
    const existing = await prisma.student.findUnique({ where: { admissionNumber: body.admissionNumber } });
    if (existing) return NextResponse.json({ error: "Admission number already exists" }, { status: 409 });
    const student = await prisma.student.create({ data: body });
    await audit({ id: session!.user.id, name: session!.user.name }, "student.create", "Student", student.id, { admissionNumber: student.admissionNumber });
    return NextResponse.json(student, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: "Could not create student" }, { status: 500 });
  }
}
