import { NextRequest, NextResponse } from "next/server";
import { ZodSchema } from "zod";
import { requireRole, getSession } from "@/lib/auth";

export class ValidationError extends Error {
  issues: unknown;
  constructor(issues: unknown) {
    super("Validation failed");
    this.issues = issues;
  }
}

export function validateOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new ValidationError(parsed.error.flatten());
  return parsed.data;
}

// Prisma model delegates are generic per model, and their method parameters are
// contravariant, so no precise structural type accepts all of them. `any` is
// confined to this boundary type; callers and results are validated by Zod.
/* eslint-disable @typescript-eslint/no-explicit-any */
type Delegate = {
  findMany: (args?: any) => Promise<any[]>;
  findUnique: (args: any) => Promise<any>;
  create: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
};
type Args = Record<string, unknown>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export function makeCrudRoutes<T>(
  delegate: Delegate,
  schema: ZodSchema<T>,
  opts: { writeRoles: Array<"ADMIN" | "TEACHER" | "STUDENT" | "PARENT">; orderBy?: Args }
) {
  async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const items = await delegate.findMany({
      where: { deletedAt: null },
      orderBy: opts.orderBy ?? { name: "asc" },
    });
    return NextResponse.json(items);
  }

  async function POST(req: NextRequest) {
    const session = await getSession();
    if (!requireRole(session, opts.writeRoles))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    try {
      const body = validateOrThrow(schema, await req.json());
      const created = await delegate.create({ data: body });
      return NextResponse.json(created, { status: 201 });
    } catch (e) {
      if (e instanceof ValidationError)
        return NextResponse.json({ error: e.issues }, { status: 400 });
      return NextResponse.json({ error: "Could not create record" }, { status: 500 });
    }
  }

  return { GET, POST };
}

export function makeCrudItemRoutes<T>(
  delegate: Delegate,
  schema: ZodSchema<Partial<T>>,
  opts: { writeRoles: Array<"ADMIN" | "TEACHER" | "STUDENT" | "PARENT"> }
) {
  async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getSession();
    if (!requireRole(session, opts.writeRoles))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    try {
      const body = validateOrThrow(schema, await req.json());
      const updated = await delegate.update({ where: { id }, data: body });
      return NextResponse.json(updated);
    } catch (e) {
      if (e instanceof ValidationError)
        return NextResponse.json({ error: e.issues }, { status: 400 });
      return NextResponse.json({ error: "Could not update record" }, { status: 500 });
    }
  }

  async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getSession();
    if (!requireRole(session, opts.writeRoles))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await delegate.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ ok: true });
  }

  return { PATCH, DELETE };
}
