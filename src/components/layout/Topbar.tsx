"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Task 26 will add a real `/api/settings/institute` GET backed by the Setting table.
// Until that lands, read a build-time env var with a sensible static fallback —
// per the controller's ruling, do not stub the endpoint or block this task on it.
const INSTITUTE_NAME = process.env.NEXT_PUBLIC_INSTITUTE_NAME || "School ERP";

function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function Topbar() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6">
      <span className="font-heading text-sm font-semibold text-foreground">
        {INSTITUTE_NAME}
      </span>

      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2">
            <Avatar size="sm">
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
            <Badge variant="secondary">{user.role}</Badge>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut />
          Sign out
        </Button>
      </div>
    </header>
  );
}
