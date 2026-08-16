import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { studentCreateSchema } from "@/lib/validation/student";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN", "TEACHER"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const students = await prisma.student.findMany({
    where: {
      deletedAt: null,
      ...(q ? { OR: [{ fullName: { contains: q } }, { admissionNumber: { contains: q } }] } : {}),
    },
    orderBy: { fullName: "asc" },
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
    return NextResponse.json(student, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: "Could not create student" }, { status: 500 });
  }
}
