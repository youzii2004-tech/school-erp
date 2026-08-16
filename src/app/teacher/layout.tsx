import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return <DashboardShell role="TEACHER">{children}</DashboardShell>;
}
