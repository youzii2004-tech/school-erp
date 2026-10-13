import { prisma } from "@/lib/prisma";

type Actor = { id?: string; name?: string | null } | undefined;

/**
 * Best-effort audit trail: never throws, so a logging failure cannot block or
 * roll back the business operation. Do not put secrets/passwords in `detail`.
 */
export async function audit(
  actor: Actor,
  action: string,
  entity: string,
  entityId?: string,
  detail?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: actor?.id,
        username: actor?.name ?? undefined,
        action,
        entity,
        entityId,
        detail: detail ? JSON.stringify(detail).slice(0, 2000) : undefined,
      },
    });
  } catch (e) {
    console.error("audit log write failed", action, e);
  }
}
