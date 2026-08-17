import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { makeCrudItemRoutes } from "@/lib/api/crud-factory";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";
import { sessionSchema } from "@/lib/validation/academic";

const partialSessionSchema = sessionSchema.partial();

// Custom PATCH (replaces the generic makeCrudItemRoutes PATCH) so that setting
// isCurrent: true on one AcademicSession also unsets it on every other one.
// The generic factory's PATCH is a plain `delegate.update`, with no hook for
// this kind of side-effect, and crud-factory.ts is reused by many other
// routes (Class, Section, Subject, ...) — adding a hook mechanism there for
// this single caller would be over-engineering. DELETE is left on the factory,
// unchanged.
//
// Both writes (unset-others, then update-this-one) run inside one
// $transaction, same race-safety pattern as the target-session conflict
// check + writes in src/app/api/promotions/route.ts: without it, a second
// concurrent "set current session" request could interleave between the
// unset and the update, leaving two sessions marked isCurrent.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = validateOrThrow(partialSessionSchema, await req.json());

    if (body.isCurrent === true) {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.academicSession.updateMany({
          where: { id: { not: id } },
          data: { isCurrent: false },
        });
        return tx.academicSession.update({ where: { id }, data: body });
      });
      return NextResponse.json(updated);
    }

    const updated = await prisma.academicSession.update({ where: { id }, data: body });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: "Could not update record" }, { status: 500 });
  }
}

export const { DELETE } = makeCrudItemRoutes(prisma.academicSession, sessionSchema.partial(), {
  writeRoles: ["ADMIN"],
});
