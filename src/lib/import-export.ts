import * as XLSX from "xlsx";
import { studentCreateSchema } from "./validation/student";

// Task 24: CSV/Excel student bulk import + export.
//
// parseStudentRows is intentionally DB-free (no prisma calls) so it stays
// synchronously testable per the Task 24 brief's Interfaces line and Step 2's
// test file — duplicate-admission-number checks against the DB happen in the
// import route (see src/app/api/students/import/route.ts), not here.
export const MAX_IMPORT_ROWS = 2000;

export type StudentRow = ReturnType<typeof studentCreateSchema.parse>;

export function parseStudentRows(buffer: Buffer): {
  valid: StudentRow[];
  errors: { row: number; message: string }[];
} {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (rows.length > MAX_IMPORT_ROWS) throw new Error(`Too many rows (max ${MAX_IMPORT_ROWS})`);

  const valid: StudentRow[] = [];
  const errors: { row: number; message: string }[] = [];

  rows.forEach((row, i) => {
    const result = studentCreateSchema.safeParse(row);
    if (result.success) valid.push(result.data);
    else errors.push({ row: i + 2, message: result.error.issues.map((iss) => iss.message).join("; ") });
  });

  return { valid, errors };
}

export function studentsToSheetBuffer(students: Record<string, unknown>[]) {
  const ws = XLSX.utils.json_to_sheet(students);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
