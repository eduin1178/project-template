"use client";

/**
 * Estado de autenticación expuesto al UI. El contrato es estable: cuando llegue
 * la spec real de autenticación, la implementación pasa a leer de la fuente
 * real (cookies HttpOnly, next-auth, etc.) sin que los consumidores cambien.
 *
 * En v1 el stub retorna siempre { status: "unauthenticated" }.
 */
export type AuthStatus =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; dashboardHref: string };

export function useAuthStatus(): AuthStatus {
  return { status: "unauthenticated" };
}
