export type SessionRoleData = {
  user?: { role?: string | null } | null;
  memberships?: { role?: string | null }[] | null;
} | null;

export function deriveDashboardHref(data: SessionRoleData): string {
  const role = data?.user?.role;
  if (role === "super_admin") return "/super";

  const memberships = data?.memberships ?? [];
  const isTenantAdmin = memberships.some(
    (m) => m?.role === "admin" || m?.role === "owner",
  );
  if (isTenantAdmin) return "/admin";

  return "/app";
}
