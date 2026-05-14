import type { ReactNode } from "react";

export type SidebarItem = {
  label: string;
  href: string;
  icon?: ReactNode;
  matchPrefix?: string;
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
  name: string;
  logo: string | null;
};

export type TeamsConfig = {
  orgs: TeamSwitcherOrg[];
  activeOrgId: string | null;
  onSwitch: (
    orgId: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
};
