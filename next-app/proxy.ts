import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "better-auth.session_token";
const PROTECTED_PREFIXES = ["/super", "/admin", "/app"];

function hasSessionCookie(request: NextRequest): boolean {
  return (
    request.cookies.has(SESSION_COOKIE) ||
    request.cookies.has(`__Secure-${SESSION_COOKIE}`)
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /accept-invitation y /super/setup deben ser accesibles sin sesión.
  if (
    pathname.startsWith("/accept-invitation") ||
    pathname.startsWith("/super/setup")
  ) {
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !hasSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && hasSessionCookie(request)) {
    return NextResponse.redirect(new URL("/post-login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/super/:path*",
    "/admin/:path*",
    "/app/:path*",
    "/login",
  ],
};
