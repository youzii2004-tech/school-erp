import { NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";

// Intentionally unauthenticated: this is read by the public Topbar and the
// login page header, before a session exists. It returns only the small,
// non-sensitive subset of the "institute" setting (name + logoPath) — never
// the full settings payload (address/contact live behind GET /api/settings,
// which is ADMIN-only).
export async function GET() {
  const institute = await getSetting("institute", { name: "", address: "", contact: "", logoPath: null as string | null });
  return NextResponse.json({ name: institute.name, logoPath: institute.logoPath ?? null });
}
