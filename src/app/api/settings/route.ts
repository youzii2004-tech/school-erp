import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, requireRole } from "@/lib/auth";
import { getSetting, setSetting } from "@/lib/settings";
import { DEFAULT_GRADE_BANDS } from "@/lib/grading";
import { validateOrThrow, ValidationError } from "@/lib/api/crud-factory";

const DEFAULT_INSTITUTE = { name: "", address: "", contact: "" };
// No attendance-rules-consuming logic exists yet elsewhere in the app (see
// Task 25 brief) — this key's shape is intentionally minimal/unused-but-present
// so a future task can extend it without a settings-route migration.
const DEFAULT_ATTENDANCE_RULES = {};

const settingWriteSchema = z.object({
  key: z.enum(["institute", "gradeBands", "attendanceRules"]),
  value: z.unknown(),
});

// ADMIN-only: returns every known settings key in one payload so the Settings
// page can hydrate all three form sections (Institute, Grading Bands, Current
// Session's non-session-table parts) from a single request.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [institute, gradeBands, attendanceRules] = await Promise.all([
    getSetting("institute", DEFAULT_INSTITUTE),
    getSetting("gradeBands", DEFAULT_GRADE_BANDS),
    getSetting("attendanceRules", DEFAULT_ATTENDANCE_RULES),
  ]);

  return NextResponse.json({ institute, gradeBands, attendanceRules });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireRole(session, ["ADMIN"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = validateOrThrow(settingWriteSchema, await req.json());
    await setSetting(body.key, body.value);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: "Could not save setting" }, { status: 500 });
  }
}
