import type { ReactNode } from "react";
import { redirectIfPasswordChangeRequired } from "@/lib/require-password-current";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  await redirectIfPasswordChangeRequired();
  return <DashboardShell role="STUDENT">{children}</DashboardShell>;
}
