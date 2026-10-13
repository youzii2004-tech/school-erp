import { UsersTable } from "@/components/users/UsersTable";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">User accounts</h1>
        <p className="text-sm text-muted-foreground">Reset a forgotten password or deactivate an account.</p>
      </div>
      <UsersTable />
    </div>
  );
}
