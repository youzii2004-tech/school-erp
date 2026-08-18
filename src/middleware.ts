import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { roleHome } from "@/lib/role-home";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role as string | undefined;
    const path = req.nextUrl.pathname;
    const areaPrefix = "/" + path.split("/")[1];
    if (role && roleHome[role] && areaPrefix !== roleHome[role] && Object.values(roleHome).includes(areaPrefix)) {
      return NextResponse.redirect(new URL(roleHome[role], req.url));
    }
    return NextResponse.next();
  },
  { callbacks: { authorized: ({ token }) => !!token } }
);

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*", "/parent/:path*"],
};
