import { NextResponse, type NextRequest } from "next/server";

import { RESERVED_SLUGS } from "@/lib/auth/reserved-slugs";

const SESSION_COOKIE = "better-auth.session_token";
const LEGACY_PROTECTED_PREFIXES = ["/super", "/admin", "/app"];

function hasSessionCookie(request: NextRequest): boolean {
  return (
    request.cookies.has(SESSION_COOKIE) ||
    request.cookies.has(`__Secure-${SESSION_COOKIE}`)
  );
}

function firstSegment(pathname: string): string | null {
  const trimmed = pathname.replace(/^\/+/, "");
  if (!trimmed) return null;
  const seg = trimmed.split("/")[0];
  return seg.length > 0 ? seg : null;
}

const LEGACY_REDIRECTS: Record<string, string> = {
  "/app": "/post-login",
  "/app/tasks": "/post-login",
  "/admin": "/post-login",
  "/admin/tasks": "/post-login",
};

function legacyRedirectTarget(pathname: string): string | null {
  if (LEGACY_REDIRECTS[pathname]) return LEGACY_REDIRECTS[pathname];
  if (pathname.startsWith("/app/tasks/")) return "/post-login";
  if (pathname.startsWith("/admin/tasks/")) return "/post-login";
  return null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas dentro de prefijos protegidos.
  if (
    pathname.startsWith("/accept-invitation") ||
    pathname.startsWith("/super/setup") ||
    pathname.startsWith("/super/accept-invitation")
  ) {
    return NextResponse.next();
  }

  // Redirects de URLs legacy. El server decide a qué slug navegar.
  const legacy = legacyRedirectTarget(pathname);
  if (legacy) {
    return NextResponse.redirect(new URL(legacy, request.url));
  }

  if (pathname === "/login" && hasSessionCookie(request)) {
    return NextResponse.redirect(new URL("/post-login", request.url));
  }

  // Rutas protegidas legacy (todavía existentes durante la transición).
  const isLegacyProtected = LEGACY_PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (isLegacyProtected && !hasSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Rutas slug-scoped: cualquier primer segmento no reservado se trata como
  // candidato a slug. El layout `app/[slug]/layout.tsx` valida existencia y
  // membresía; el proxy solo gatea autenticación.
  const seg = firstSegment(pathname);
  if (seg && !RESERVED_SLUGS.has(seg)) {
    if (!hasSessionCookie(request)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Rutas autenticadas + URLs legacy + dinámicas. Excluye assets, api y
    // archivos estáticos vía negative-lookahead en el primer segmento.
    "/((?!api/|_next/|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
