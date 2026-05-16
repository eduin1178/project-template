import type { ComponentProps } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

import type { MenuRole } from "@/lib/auth/role-menu";

import { NavBrand } from "./nav-brand";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { TeamSwitcher } from "./team-switcher";
import type { SidebarConfig, SidebarUser, TeamsConfig } from "./types";

type AppSidebarProps = ComponentProps<typeof Sidebar> & {
  config: SidebarConfig;
  user: SidebarUser;
  role: MenuRole;
  teams?: TeamsConfig;
};

export function AppSidebar({
  config,
  user,
  role,
  teams,
  ...sidebarProps
}: AppSidebarProps) {
  const visibleItems = config.items.filter(
    (item) => !item.requiresRole || item.requiresRole === role,
  );

  return (
    <Sidebar collapsible="icon" {...sidebarProps}>
      <SidebarHeader>
        {teams && teams.orgs.length > 0 ? (
          <TeamSwitcher teams={teams} />
        ) : (
          <NavBrand brand={config.brand} />
        )}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={visibleItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} role={role} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
