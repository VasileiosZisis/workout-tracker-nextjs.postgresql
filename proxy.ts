import { auth } from "@/auth";
import { NextResponse } from "next/server";

const protectedRoutes = ["/logs", "/profile"];

export default auth((request) => {
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  if (!request.auth && isProtectedRoute) {
    const loginUrl = new URL("/login", request.nextUrl);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.href);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/logs/:path*", "/profile/:path*"],
};
