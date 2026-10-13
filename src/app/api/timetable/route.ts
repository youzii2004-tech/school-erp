import { NextRequest, NextResponse } from "next/server";
import { requireRole, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { timetableEntrySchema, rangesOverlap } from "@/lib/validation/timetable";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

const ENTRY_INCLUDE = {
  subject: true,
  teacher: true,
  section: { include: { class: true } },
} as const;

// Ruling carried forward from Task 19 brief review: GET has no role restriction,
// matching this app's existing looser convention on GET /api/attendance and
// GET /api/exam-subjects — any authenticated user (including one teacher looking
// up another teacher's schedule) may query by sectionId or teacherId.
//
// `teacherId=me` is a convenience sentinel (not in the brief's literal query
// shape) so the teacher timetable page can ask for "my schedule" without a
// separate /api/teachers/me lookup endpoint — it resolves server-side from the
// session, the same ownership pattern already used by GET /api/teacher-subjects.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sectionId = req.nextUrl.searchParams.get("sectionId");
  let teacherId = req.nextUrl.searchParams.get("teacherId");

  if (teacherId === "me") {
    if (!requireRole(session, ["TEACHER"]))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const teacher = await prisma.teacher.findUnique({ where: { userId: session!.user.id } });
    if (!teacher) return NextResponse.json([]);
    teacherId = teacher.id;
  }

  if (!sectionId && !teacherId)
    return NextResponse.json({ error: "sectionId or teacherId is required" }, { status: 400 });

  const entries = await prisma.timetableEntry.findMany({
    where: sectionId ? { sectionId } : { teacherId: teacherId! },
    include: ENTRY_INCLUDE,
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return NextResponse.json(entries);
}

// POST (ADMIN only): the one binding requirement from Step 2 is the overlap
// guard — reject with 409 if the same teacher OR the same section already has
// an entry on the same dayOfWeek whose [startTime, endTime) range overlaps the
// new one. Checked as two separate queries/conditions so the 409 message can
// say which side conflicted (teacher vs section).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validateOrThrow(timetableEntrySchema, await req.json());

    const [teacherDayEntries, sectionDayEntries] = await Promise.all([
      prisma.timetableEntry.findMany({
        where: { teacherId: body.teacherId, dayOfWeek: body.dayOfWeek },
      }),
      prisma.timetableEntry.findMany({
        where: { sectionId: body.sectionId, dayOfWeek: body.dayOfWeek },
      }),
    ]);

    const teacherConflict = teacherDayEntries.some((e) =>
      rangesOverlap(body.startTime, body.endTime, e.startTime, e.endTime)
    );
    if (teacherConflict)
      return NextResponse.json(
        { error: "This teacher already has a class scheduled that overlaps this time." },
        { status: 409 }
      );

    const sectionConflict = sectionDayEntries.some((e) =>
      rangesOverlap(body.startTime, body.endTime, e.startTime, e.endTime)
    );
    if (sectionConflict)
      return NextResponse.json(
        { error: "This section already has a class scheduled that overlaps this time." },
        { status: 409 }
      );

    const created = await prisma.timetableEntry.create({ data: body, include: ENTRY_INCLUDE });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: "Could not create timetable entry" }, { status: 500 });
  }
}
