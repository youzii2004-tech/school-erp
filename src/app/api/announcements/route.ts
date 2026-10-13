import { NextRequest, NextResponse } from "next/server";
import { requireRole, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { announcementCreateSchema } from "@/lib/validation/announcement";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

// GET: every authenticated role sees a role/class/section-scoped slice of
// announcements. `audience` is a plain string column (ALL | CLASS:<id> |
// SECTION:<id> | ROLE:<role>), not a structured relation, so the match is
// built as a Prisma `OR` of exact-string conditions from ids resolved
// server-side from session.user.id — never from client input, same
// ownership pattern as every prior task (GET /api/results, /api/exams, etc).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;

  if (role === "ADMIN") {
    const items = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(items);
  }

  const or: Array<Record<string, string>> = [{ audience: "ALL" }, { audience: `ROLE:${role}` }];

  if (role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
    if (teacher) {
      const assignments = await prisma.teacherSubject.findMany({ where: { teacherId: teacher.id } });
      const classIds = new Set(assignments.map((a) => a.classId));
      const sectionIds = new Set(assignments.map((a) => a.sectionId));
      for (const id of classIds) or.push({ audience: `CLASS:${id}` });
      for (const id of sectionIds) or.push({ audience: `SECTION:${id}` });
    }
  } else if (role === "STUDENT") {
    const student = await prisma.student.findUnique({ where: { userId: session.user.id } });
    if (student) {
      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId: student.id, status: "ACTIVE" },
      });
      if (enrollment) {
        or.push({ audience: `CLASS:${enrollment.classId}` });
        or.push({ audience: `SECTION:${enrollment.sectionId}` });
      }
    }
  } else if (role === "PARENT") {
    const links = await prisma.guardianLink.findMany({ where: { userId: session.user.id } });
    const studentIds = [...new Set(links.map((l) => l.studentId))];
    if (studentIds.length > 0) {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: { in: studentIds }, status: "ACTIVE" },
      });
      const classIds = new Set(enrollments.map((e) => e.classId));
      const sectionIds = new Set(enrollments.map((e) => e.sectionId));
      for (const id of classIds) or.push({ audience: `CLASS:${id}` });
      for (const id of sectionIds) or.push({ audience: `SECTION:${id}` });
    }
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await prisma.announcement.findMany({
    where: { OR: or },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

// POST: ADMIN and TEACHER only. The brief's explicit minimum bar is a
// client-side restriction (the create dialog only offers the teacher's own
// sections as audience options) — enforced here too since it's cheap: a
// TEACHER-authored SECTION:<id> announcement must be one of their own
// TeacherSubject sections, closing the gap a hand-crafted request could
// otherwise exploit.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ["ADMIN", "TEACHER"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = validateOrThrow(announcementCreateSchema, await req.json());

    if (session!.user.role === "TEACHER" && body.audience.startsWith("SECTION:")) {
      const sectionId = body.audience.slice("SECTION:".length);
      const teacher = await prisma.teacher.findUnique({ where: { userId: session!.user.id } });
      const assignment = teacher
        ? await prisma.teacherSubject.findFirst({ where: { teacherId: teacher.id, sectionId } })
        : null;
      if (!assignment)
        return NextResponse.json(
          { error: "You can only target sections you teach" },
          { status: 403 }
        );
    }

    const created = await prisma.announcement.create({
      data: { ...body, createdById: session!.user.id },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: "Could not create announcement" }, { status: 500 });
  }
}
