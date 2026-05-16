export type MenuRole = "super_admin" | "admin" | "user";

export type MenuItemKey =
  | "profile"
  | "organizations"
  | "invitations"
  | "sign-out";

export type UserMenuItem = {
  key: MenuItemKey;
  label: string;
  href?: string;
};

type MinimalSession = {
  user?: { role?: string | null } | null;
} | null;

type MinimalMembership = { role?: string | null };

export function deriveMenuRole(
  session: MinimalSession,
  memberships: MinimalMembership[] | null | undefined,
): MenuRole {
  if (session?.user?.role === "super_admin") return "super_admin";
  const isTenantAdmin = (memberships ?? []).some(
    (m) => m?.role === "admin" || m?.role === "owner",
  );
  if (isTenantAdmin) return "admin";
  return "user";
}

export function getUserMenuItems(role: MenuRole): UserMenuItem[] {
  const items: UserMenuItem[] = [
    { key: "profile", label: "Mi perfil", href: "/account/profile" },
  ];

  if (role !== "super_admin") {
    items.push({
      key: "organizations",
      label: "Mis instituciones",
      href: "/account/organizations",
    });
  }

  items.push({
    key: "invitations",
    label: "Invitaciones",
    href: "/account/invitations",
  });

  items.push({ key: "sign-out", label: "Cerrar sesión" });

  return items;
}
