import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

function contentTypeFor(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Reject any raw ".." (or empty) segment before we even build a path — decoding
  // happens automatically for dynamic route segments, so check the decoded form too.
  if (
    !pathSegments ||
    pathSegments.length === 0 ||
    pathSegments.some((seg) => {
      const decoded = decodeURIComponent(seg);
      return seg === ".." || decoded === ".." || seg === "" || decoded === "";
    })
  ) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const relPath = pathSegments.join("/");
  const uploadsRoot = path.resolve(process.cwd(), "uploads");
  const resolvedPath = path.resolve(uploadsRoot, relPath);

  // Trailing separator on the root prevents an "uploads-evil" prefix match from
  // slipping past a plain startsWith(uploadsRoot) check.
  const rootWithSep = uploadsRoot + path.sep;
  if (resolvedPath !== uploadsRoot && !resolvedPath.startsWith(rootWithSep)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  // Look up the owning Document by the relative path stored at upload time
  // (students/<studentId>/<filename>), then apply the same ownership rules as
  // GET /api/students/[id].
  const document = await prisma.document.findFirst({ where: { filePath: relPath } });
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const student = await prisma.student.findUnique({ where: { id: document.studentId } });
  if (!student || student.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "STUDENT" && student.userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (session.user.role === "PARENT") {
    const linked = await prisma.guardianLink.findFirst({
      where: { studentId: student.id, userId: session.user.id },
    });
    if (!linked) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // ADMIN and TEACHER pass through unconditionally.

  let fileBuffer: Buffer;
  try {
    fileBuffer = await readFile(resolvedPath);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      "Content-Type": contentTypeFor(resolvedPath),
      "Content-Disposition": `inline; filename="${path.basename(resolvedPath)}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      "Cache-Control": "private, no-store",
    },
  });
}
