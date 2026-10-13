"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type U = { id: string; username: string; email: string; role: string; isActive: boolean; mustChangePassword: boolean };

export function UsersTable() {
  const [users, setUsers] = useState<U[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function reset(u: U) {
    if (!confirm(`Reset password for ${u.username}? They will have to choose a new one at next sign-in.`)) return;
    const res = await fetch(`/api/users/${u.id}/reset-password`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setNotice(res.ok ? `Temporary password for ${data.username}: ${data.tempPassword} — shown once; give it to the user privately.` : data.error ?? "Failed");
    void load();
  }
  async function toggle(u: U) {
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    if (!res.ok) setNotice((await res.json().catch(() => ({}))).error ?? "Failed");
    else setNotice(null);
    void load();
  }

  return (
    <div className="space-y-4">
      {notice && <p role="status" className="rounded-md border border-border bg-muted p-3 text-sm font-mono break-all">{notice}</p>}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr><th className="p-2">Username</th><th className="p-2">Role</th><th className="p-2">Status</th><th className="p-2"></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-2">{u.username}<div className="text-xs text-muted-foreground">{u.email}</div></td>
                <td className="p-2">{u.role}</td>
                <td className="p-2">{u.isActive ? "Active" : "Deactivated"}{u.mustChangePassword ? " · must change password" : ""}</td>
                <td className="p-2 space-x-2 whitespace-nowrap text-right">
                  <Button size="sm" variant="outline" onClick={() => reset(u)}>Reset password</Button>
                  <Button size="sm" variant="outline" onClick={() => toggle(u)}>{u.isActive ? "Deactivate" : "Activate"}</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
