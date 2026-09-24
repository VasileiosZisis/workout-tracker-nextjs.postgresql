import { auth } from "@/auth";
import { NextResponse } from "next/server";

const protectedRoutes = ["/logs", "/profile"];

type AuthProxyRequest = {
  auth: {
    user?: {
      isDemo?: boolean;
    };
  } | null;
  nextUrl: {
    href: string;
    pathname: string;
    search: string;
  };
};

export function handleProxyRequest(request: AuthProxyRequest) {
  const isHomeRoute = request.nextUrl.pathname === "/";
  const isRegularUser = Boolean(
    request.auth?.user && !request.auth.user.isDemo,
  );

  if (isHomeRoute && isRegularUser) {
    return NextResponse.redirect(new URL("/logs", request.nextUrl.href));
  }

  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  if (!request.auth && isProtectedRoute) {
    const loginUrl = new URL("/login", request.nextUrl.href);
    loginUrl.searchParams.set(
      "callbackUrl",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export default auth(handleProxyRequest);

export const config = {
  matcher: ["/", "/logs/:path*", "/profile/:path*"],
};
