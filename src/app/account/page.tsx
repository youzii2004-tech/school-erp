import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ force?: string }> }) {
  const { force } = await searchParams;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const role = session.user.role as "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
  return (
    <DashboardShell role={role}>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold">My account</h1>
          <p className="text-sm text-muted-foreground">Signed in as {session.user.name}. Change your password below.</p>
        </div>
        {force && (
          <p className="rounded-md border border-border bg-muted p-3 text-sm">
            Your password was reset by an administrator. Please choose a new password to continue.
          </p>
        )}
        <ChangePasswordForm />
      </div>
    </DashboardShell>
  );
}
