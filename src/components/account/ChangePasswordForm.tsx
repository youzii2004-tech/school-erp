"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ ok: true, text: "Password changed." });
        setCurrentPassword("");
        setNewPassword("");
      } else {
        const err = data?.error;
        const text =
          typeof err === "string"
            ? err
            : (Object.values(err?.fieldErrors ?? {}).flat()[0] as string | undefined) ?? "Could not change password";
        setMessage({ ok: false, text });
      }
    } catch {
      setMessage({ ok: false, text: "Network error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-sm space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input id="currentPassword" type="password" autoComplete="current-password" required
          value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input id="newPassword" type="password" autoComplete="new-password" required minLength={10}
          value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <p className="text-xs text-muted-foreground">At least 10 characters, with a letter and a number.</p>
      </div>
      {message && (
        <p role="status" className={message.ok ? "text-sm text-green-700" : "text-sm text-destructive"}>
          {message.text}
        </p>
      )}
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Change password"}</Button>
    </form>
  );
}
