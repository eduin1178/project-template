import type { ReactNode } from "react";

import type { MenuRole } from "@/lib/auth/role-menu";

export type SidebarItem = {
  label: string;
  href: string;
  icon?: ReactNode;
  matchPrefix?: string;
  /**
   * Si está definido, el ítem solo se renderiza para usuarios cuyo rol
   * de menú es exactamente ese valor. Útil para entradas globales como
   * "Panel de plataforma" que solo aplican a super_admin.
   */
  requiresRole?: MenuRole;
};

export type SidebarBrand = {
  label: string;
  href: string;
  icon?: ReactNode;
  description?: string;
};

export type SidebarUser = {
  name: string;
  email: string;
  image?: string | null;
};

export type SidebarConfig = {
  brand: SidebarBrand;
  items: SidebarItem[];
};

export type TeamSwitcherOrg = {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
};

export type TeamsConfig = {
  orgs: TeamSwitcherOrg[];
  activeOrgId: string | null;
  onSwitch: (
    organizationSlug: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
};
