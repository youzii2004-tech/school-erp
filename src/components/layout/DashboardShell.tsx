import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

type Role = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

export function DashboardShell({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
