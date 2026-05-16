import { NextResponse, type NextRequest } from "next/server";

import { RESERVED_SLUGS } from "@/lib/auth/reserved-slugs";

const SESSION_COOKIE = "better-auth.session_token";

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
  if (pathname === "/app" || pathname.startsWith("/app/")) return "/post-login";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "/post-login";
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

  // /super requiere sesión (defensa en profundidad).
  if (pathname === "/super" || pathname.startsWith("/super/")) {
    if (!hasSessionCookie(request)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
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
    // Excluye:
    // - api/  → rutas de API
    // - _next/ → assets del bundler
    // - images/, fonts/, assets/ → estáticos en /public
    // - cualquier path cuyo último segmento tenga extensión (heurística:
    //   contiene un punto seguido de letras/dígitos al final → archivo)
    "/((?!api/|_next/|images/|fonts/|assets/|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
