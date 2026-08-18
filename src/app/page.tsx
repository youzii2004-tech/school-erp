import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { roleHome } from "@/lib/role-home";

// "/" previously served the unedited create-next-app scaffold: no auth check,
// no redirect, so every visitor (signed in or not) landed on Next.js/Vercel
// boilerplate instead of the ERP. This now sends a signed-out visitor to
// /login and a signed-in visitor straight to their role's home area, using
// the same roleHome map middleware.ts uses for its own redirects.
export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  redirect(roleHome[session.user.role] ?? "/login");
}
