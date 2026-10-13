import { NextRequest, NextResponse } from "next/server";
import { requireRole, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { studentsToSheetBuffer } from "@/lib/import-export";

// Task 24: export non-deleted students to an .xlsx file. ADMIN/TEACHER.
//
// The real GET /api/students (Task 6) only supports a `q` full-text param
// (OR match on fullName/admissionNumber) — there is no classId/class filter
// anywhere in the existing students list page or route, so this only
// supports `q`, matching that route's exact filter shape rather than
// inventing a class filter that doesn't exist elsewhere in the app.
export async function GET(req: NextRequest) {
  const session = await getSession();
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

  const rows = students.map((s) => ({
    admissionNumber: s.admissionNumber,
    fullName: s.fullName,
    gender: s.gender,
    dob: s.dob.toISOString().slice(0, 10),
    cnicOrBForm: s.cnicOrBForm ?? "",
    bloodGroup: s.bloodGroup ?? "",
    phone: s.phone ?? "",
    address: s.address ?? "",
    previousSchool: s.previousSchool ?? "",
    status: s.status,
  }));

  const buffer = studentsToSheetBuffer(rows);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="students-export.xlsx"`,
    },
  });
}
