import { NextRequest, NextResponse } from "next/server";
import { requireRole, getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { parseStudentRows, StudentRow } from "@/lib/import-export";

// Task 24: CSV/Excel bulk student import. ADMIN only.
//
// Two-step preview/commit flow: without ?commit=true this only parses the
// uploaded sheet and reports what WOULD happen (valid rows, per-row parse
// errors, and duplicate admission numbers) — nothing is written. With
// ?commit=true it re-runs the same computation (so a race between preview
// and commit is caught, not assumed away) and then writes.
//
// Duplicate handling has two sources, both surfaced in the same `duplicates`
// array so the UI doesn't need to distinguish them:
//   1. Within the uploaded file itself — two rows sharing an admissionNumber.
//      Caught here (parseStudentRows is DB-free per the Task 24 interface,
//      so this can't live there). Without this check, createMany would throw
//      a raw unique-constraint error on commit instead of a clean preview.
//      Convention: keep the FIRST occurrence as valid, flag every later
//      occurrence as a duplicate.
//   2. Against existing Student rows in the DB — checked via a single
//      findMany({ admissionNumber: { in: [...] } }) here in the route (not
//      in parseStudentRows), so parseStudentRows stays synchronously
//      testable per the Task 24 brief's Interfaces line.
const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

type DuplicateEntry = {
  admissionNumber: string;
  validRowIndex: number; // 1-based position within the parsed `valid` list (not the sheet row)
  reason: "duplicate within file" | "already exists in database";
};

async function computePreview(buffer: Buffer) {
  const { valid, errors } = parseStudentRows(buffer);

  const duplicates: DuplicateEntry[] = [];
  const seen = new Map<string, number>(); // admissionNumber -> 1-based index of first occurrence
  const dedupedWithinFile: StudentRow[] = [];

  valid.forEach((row, i) => {
    const idx = i + 1; // 1-based
    if (seen.has(row.admissionNumber)) {
      duplicates.push({
        admissionNumber: row.admissionNumber,
        validRowIndex: idx,
        reason: "duplicate within file",
      });
      return;
    }
    seen.set(row.admissionNumber, idx);
    dedupedWithinFile.push(row);
  });

  const existing =
    dedupedWithinFile.length > 0
      ? await prisma.student.findMany({
          where: { admissionNumber: { in: dedupedWithinFile.map((r) => r.admissionNumber) } },
          select: { admissionNumber: true },
        })
      : [];
  const existingSet = new Set(existing.map((e) => e.admissionNumber));

  const finalValid = dedupedWithinFile.filter((row) => {
    if (existingSet.has(row.admissionNumber)) {
      duplicates.push({
        admissionNumber: row.admissionNumber,
        validRowIndex: seen.get(row.admissionNumber)!,
        reason: "already exists in database",
      });
      return false;
    }
    return true;
  });

  return { valid: finalValid, errors, duplicates };
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string")
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  // xlsx has known unpatched parser vulnerabilities (ReDoS / prototype pollution),
  // so bound what we feed it.
  if (file.size > MAX_IMPORT_BYTES)
    return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());

  let preview: Awaited<ReturnType<typeof computePreview>>;
  try {
    preview = await computePreview(buffer);
  } catch {
    return NextResponse.json({ error: "Could not read the uploaded file" }, { status: 400 });
  }

  const commit = req.nextUrl.searchParams.get("commit") === "true";
  if (!commit) return NextResponse.json(preview, { status: 200 });

  if (preview.valid.length === 0)
    return NextResponse.json({ ...preview, imported: 0 }, { status: 200 });

  try {
    const result = await prisma.student.createMany({ data: preview.valid });
    await audit({ id: session!.user.id, name: session!.user.name }, "student.import", "Student", undefined, { imported: result.count });
    return NextResponse.json(
      { ...preview, imported: result.count },
      { status: 201 }
    );
  } catch (e) {
    // A concurrent import between preview and commit inserting the same
    // admissionNumber surfaces here as Prisma/SQLite's P2002 on createMany —
    // map it to a clean 409 rather than a raw 500, same pattern as
    // src/app/api/promotions/route.ts.
    if ((e as { code?: string }).code === "P2002")
      return NextResponse.json(
        { error: "One or more admission numbers were imported by someone else just now — please re-preview and retry" },
        { status: 409 }
      );
    return NextResponse.json({ error: "Could not import students" }, { status: 500 });
  }
}
