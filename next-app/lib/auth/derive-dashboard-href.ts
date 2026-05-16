export type ActiveOrgRole = "owner" | "admin" | "member" | null;

export type SessionRoleData = {
  user?: { role?: string | null } | null;
  memberships?: { role?: string | null }[] | null;
  activeOrgRole?: ActiveOrgRole;
  activeOrgSlug?: string | null;
} | null;

export function deriveDashboardHref(data: SessionRoleData): string {
  const role = data?.user?.role;
  const activeOrgRole = data?.activeOrgRole;
  const activeOrgSlug = data?.activeOrgSlug ?? null;
  const hasActiveOrgRole =
    data !== null && data !== undefined && "activeOrgRole" in data;

  if (hasActiveOrgRole) {
    if (activeOrgRole === null) {
      return role === "super_admin" ? "/super" : "/account/organizations";
    }
    if (activeOrgSlug) {
      if (activeOrgRole === "owner" || activeOrgRole === "admin") {
        return `/${activeOrgSlug}/admin`;
      }
      if (activeOrgRole === "member") return `/${activeOrgSlug}`;
    }
    // Fallback legacy si el caller aún no pasa slug.
    if (activeOrgRole === "owner" || activeOrgRole === "admin") return "/admin";
    if (activeOrgRole === "member") return "/app";
  }

  if (role === "super_admin") return "/super";

  const memberships = data?.memberships ?? [];
  const isTenantAdmin = memberships.some(
    (m) => m?.role === "admin" || m?.role === "owner",
  );
  if (isTenantAdmin) return "/admin";

  return "/app";
}
