"use client";

import { authClient } from "./client";

export type AuthStatus =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; dashboardHref: string };

export function useAuthStatus(): AuthStatus {
  const { data, isPending } = authClient.useSession();

  if (isPending) return { status: "loading" };
  if (!data?.user) return { status: "unauthenticated" };

  const role = (data.user as { role?: string | null }).role;
  // Para super_admin el destino es directo. Para los demás roles, /post-login
  // resuelve membership en el servidor y redirige a /admin o /app.
  const dashboardHref = role === "super_admin" ? "/super" : "/post-login";

  return { status: "authenticated", dashboardHref };
}
