import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return <DashboardShell role="STUDENT">{children}</DashboardShell>;
}
