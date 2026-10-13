import { redirect } from "next/navigation";
import { requireRole, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const session = await getSession();
  if (!requireRole(session, ["ADMIN"])) redirect("/login");
  const rows = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Audit log</h1>
        <p className="text-sm text-muted-foreground">The 200 most recent changes: who did what, and when.</p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr><th className="p-2">When</th><th className="p-2">User</th><th className="p-2">Action</th><th className="p-2">Record</th><th className="p-2">Detail</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="p-2 whitespace-nowrap">{r.createdAt.toLocaleString()}</td>
                <td className="p-2">{r.username ?? "—"}</td>
                <td className="p-2 font-mono text-xs">{r.action}</td>
                <td className="p-2 font-mono text-xs">{r.entity}{r.entityId ? ` ${r.entityId}` : ""}</td>
                <td className="p-2 font-mono text-xs break-all">{r.detail ?? ""}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="p-4 text-muted-foreground" colSpan={5}>No entries yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
