"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MobileSidebarTrigger } from "@/components/layout/Sidebar";

type Role = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

// Task 25 added a real, unauthenticated GET /api/settings/institute backed by
// the Setting table (src/lib/settings.ts). Fetch it client-side and fall back
// to the same static name used before if the setting is unset/empty or the
// request fails, so this never renders blank.
const FALLBACK_INSTITUTE_NAME = process.env.NEXT_PUBLIC_INSTITUTE_NAME || "School ERP";

function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function Topbar({ role }: { role: Role }) {
  const { data: session } = useSession();
  const user = session?.user;
  const [instituteName, setInstituteName] = useState(FALLBACK_INSTITUTE_NAME);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/institute")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.name) setInstituteName(data.name);
      })
      .catch(() => {
        // Keep the fallback name — this must never block rendering the Topbar.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <MobileSidebarTrigger role={role} />
        <span className="font-heading text-sm font-semibold text-foreground">
          {instituteName}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2">
            <Avatar size="sm">
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {user.role}
            </Badge>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut />
          <span className="hidden sm:inline">Sign out</span>
          <span className="sr-only sm:hidden">Sign out</span>
        </Button>
      </div>
    </header>
  );
}
