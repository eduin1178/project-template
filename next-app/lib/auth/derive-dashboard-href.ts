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
    // Sin slug resoluble: delega al server vía /post-login.
    return "/post-login";
  }

  if (role === "super_admin") return "/super";

  // Sin contexto de org activa, no podemos construir slug. Que el server
  // decida vía /post-login.
  return "/post-login";
}
