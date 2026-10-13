import { NextRequest, NextResponse } from "next/server";
import { requireRole, hashPassword, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { teacherCreateSchema } from "@/lib/validation/teacher";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

export async function GET() {
  const session = await getSession();
  if (!requireRole(session, ["ADMIN"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const teachers = await prisma.teacher.findMany({ where: { deletedAt: null }, include: { user: true }, orderBy: { fullName: "asc" } });
  return NextResponse.json(teachers);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ["ADMIN"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validateOrThrow(teacherCreateSchema, await req.json());
    const passwordHash = await hashPassword(body.password);
    const teacher = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: body.email, username: body.username, passwordHash, role: "TEACHER" },
      });
      return tx.teacher.create({
        data: {
          userId: user.id, fullName: body.fullName, cnic: body.cnic, qualification: body.qualification,
          joiningDate: body.joiningDate, designation: body.designation, phone: body.phone,
        },
      });
    });
    return NextResponse.json(teacher, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    if ((e as { code?: string }).code === "P2002") return NextResponse.json({ error: "Email or username already in use" }, { status: 409 });
    return NextResponse.json({ error: "Could not create teacher" }, { status: 500 });
  }
}
