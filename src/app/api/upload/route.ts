import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { safeUploadExtension, isSafePathId } from "@/lib/upload-validation";

const ALLOWED_TYPES = ["BIRTH_CERT", "CNIC", "PREVIOUS_CERT", "PHOTO", "LEAVING_CERT", "OTHER"];
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const studentId = form.get("studentId");
  const type = form.get("type");
  const file = form.get("file");

  if (typeof studentId !== "string" || typeof type !== "string" || !(file instanceof File) || !ALLOWED_TYPES.includes(type))
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });

  if (!isSafePathId(studentId)) return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  const ext = safeUploadExtension(file.name);
  if (!ext) return NextResponse.json({ error: "Unsupported file type (jpg, png, gif, webp, pdf only)" }, { status: 400 });
  const student = await prisma.student.findFirst({ where: { id: studentId, deletedAt: null }, select: { id: true } });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  const filename = `${randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), "uploads", "students", studentId);
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  const relPath = `students/${studentId}/${filename}`;
  await prisma.document.create({ data: { studentId, type, filePath: relPath } });
  return NextResponse.json({ filePath: relPath }, { status: 201 });
}
