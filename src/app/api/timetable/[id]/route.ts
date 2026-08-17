import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// TimetableEntry has no deletedAt field (per brief context) — timetable rows are
// simple enough that edits are delete-and-recreate in the UI, so this is a real
// hard delete, unlike the soft-delete DELETE handlers elsewhere in the app.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.timetableEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
