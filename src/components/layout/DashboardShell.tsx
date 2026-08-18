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
      <div className="print:hidden">
        <Sidebar role={role} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="print:hidden">
          <Topbar role={role} />
        </div>
        <main className="flex-1 overflow-y-auto print:overflow-visible">
          <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-8 print:max-w-none print:p-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
