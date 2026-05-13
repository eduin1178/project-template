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
import type { SidebarConfig, SidebarUser } from "./types";

type AppSidebarProps = ComponentProps<typeof Sidebar> & {
  config: SidebarConfig;
  user: SidebarUser;
  role: MenuRole;
};

export function AppSidebar({
  config,
  user,
  role,
  ...sidebarProps
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...sidebarProps}>
      <SidebarHeader>
        <NavBrand brand={config.brand} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={config.items} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} role={role} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
