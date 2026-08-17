import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { promotionCreateSchema } from "@/lib/validation/enrollment";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

// Task 21: bulk class promotion. Body: { fromSectionId, toClassId, toSectionId,
// toAcademicSessionId, studentIds }. ADMIN only.
//
// Everything — the target-session conflict check, the roll-number reads, and
// every per-student write — happens inside ONE $transaction. Doing the conflict
// check as a separate pre-check followed by a separate write transaction would
// leave a window for a second concurrent promotion request to slip a student
// into the target session between the check and the write (same class of
// race flagged as Important in Task 12's review). Running it inside the
// transaction means Prisma's transaction isolation covers the whole
// check-then-write sequence.
//
// Students in studentIds with no ACTIVE enrollment in fromSectionId (stale UI
// data) are skipped, not fatal — reported back per-student in `skipped` rather
// than aborting the whole batch. This is the more defensible default for a
// bulk operation: an admin promoting 40 students shouldn't lose all 40 because
// one row's data went stale between page load and submit. This is an explicit
// choice, not the only valid one — see task-21-report.md.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = validateOrThrow(promotionCreateSchema, await req.json());
    const { fromSectionId, toClassId, toSectionId, toAcademicSessionId, studentIds } = body;

    const result = await prisma.$transaction(async (tx) => {
      const [toClass, toSession, toSection] = await Promise.all([
        tx.class.findUnique({ where: { id: toClassId } }),
        tx.academicSession.findUnique({ where: { id: toAcademicSessionId } }),
        tx.section.findUnique({ where: { id: toSectionId } }),
      ]);
      if (!toClass) throw new Error("TO_CLASS_NOT_FOUND");
      if (!toSession) throw new Error("TO_SESSION_NOT_FOUND");
      if (!toSection) throw new Error("TO_SECTION_NOT_FOUND");
      if (toSection.classId !== toClassId) throw new Error("TO_SECTION_CLASS_MISMATCH");
      if (toClass.sessionId !== toAcademicSessionId) throw new Error("TO_CLASS_SESSION_MISMATCH");

      // Conflict check runs inside this same transaction, immediately before
      // the writes below, so no concurrent request can slip a student into
      // toAcademicSessionId in between the check and the create() calls.
      const conflicting = await tx.enrollment.findMany({
        where: { studentId: { in: studentIds }, academicSessionId: toAcademicSessionId },
        select: { studentId: true },
      });
      if (conflicting.length > 0) throw new Error("ALREADY_ENROLLED");

      // Roll numbers are "next available in that section": seed a counter from
      // the count already there, then bump it once per insert (never re-queried)
      // so N students promoted in one request get consecutive numbers instead of
      // all colliding on one count taken before any insert happened. Roll numbers
      // are free-text (EnrollDialog allows non-sequential manual entry), so a
      // pre-existing row could already occupy the next counter value — read the
      // existing set up front and skip past any collision rather than letting the
      // unique constraint reject the whole batch.
      const existingRolls = new Set(
        (
          await tx.enrollment.findMany({
            where: { sectionId: toSectionId, academicSessionId: toAcademicSessionId },
            select: { rollNumber: true },
          })
        ).map((e) => e.rollNumber)
      );
      // Walk up from 0 (not existingRolls.size) so gaps below the seed point
      // are actually filled, not permanently skipped — roll numbers are free
      // text (EnrollDialog allows manual non-sequential entry), so "count of
      // existing rows" is not the same as "highest number in use."
      let rollCounter = 0;

      const promoted: string[] = [];
      const skipped: { studentId: string; reason: string }[] = [];

      for (const studentId of studentIds) {
        const fromEnrollment = await tx.enrollment.findFirst({
          where: { studentId, sectionId: fromSectionId, status: "ACTIVE" },
          include: { class: true, session: true },
        });
        if (!fromEnrollment) {
          skipped.push({ studentId, reason: "No active enrollment in the source section" });
          continue;
        }

        await tx.enrollment.update({
          where: { id: fromEnrollment.id },
          data: { status: "PROMOTED" },
        });

        let nextRoll: string;
        do {
          rollCounter += 1;
          nextRoll = String(rollCounter);
        } while (existingRolls.has(nextRoll));
        existingRolls.add(nextRoll);

        await tx.enrollment.create({
          data: {
            studentId,
            academicSessionId: toAcademicSessionId,
            classId: toClassId,
            sectionId: toSectionId,
            rollNumber: nextRoll,
            status: "ACTIVE",
          },
        });

        await tx.promotionHistory.create({
          data: {
            studentId,
            fromClassName: fromEnrollment.class.name,
            toClassName: toClass.name,
            fromSessionName: fromEnrollment.session.name,
            toSessionName: toSession.name,
          },
        });

        promoted.push(studentId);
      }

      return { promoted, skipped };
    }, { timeout: 30000 });

    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    if ((e as Error).message === "TO_CLASS_NOT_FOUND")
      return NextResponse.json({ error: "Target class not found" }, { status: 400 });
    if ((e as Error).message === "TO_SESSION_NOT_FOUND")
      return NextResponse.json({ error: "Target session not found" }, { status: 400 });
    if ((e as Error).message === "TO_SECTION_NOT_FOUND")
      return NextResponse.json({ error: "Target section not found" }, { status: 400 });
    if ((e as Error).message === "TO_SECTION_CLASS_MISMATCH")
      return NextResponse.json({ error: "Target section does not belong to the target class" }, { status: 400 });
    if ((e as Error).message === "TO_CLASS_SESSION_MISMATCH")
      return NextResponse.json({ error: "Target class does not belong to the target session" }, { status: 400 });
    if ((e as Error).message === "ALREADY_ENROLLED")
      return NextResponse.json(
        { error: "One or more selected students already have an enrollment in the target session" },
        { status: 409 }
      );
    if ((e as { code?: string }).code === "P2002")
      return NextResponse.json(
        { error: "A roll-number or enrollment conflict occurred while saving — please retry" },
        { status: 409 }
      );
    return NextResponse.json({ error: "Could not process promotion" }, { status: 500 });
  }
}
