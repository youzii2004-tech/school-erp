import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function ParentLayout({ children }: { children: ReactNode }) {
  return <DashboardShell role="PARENT">{children}</DashboardShell>;
}
