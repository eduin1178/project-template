import type { ComponentProps } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

import { NavBrand } from "./nav-brand";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import type { SidebarConfig, SidebarUser } from "./types";

type AppSidebarProps = ComponentProps<typeof Sidebar> & {
  config: SidebarConfig;
  user: SidebarUser;
  signOutAction: () => void | Promise<void>;
};

export function AppSidebar({
  config,
  user,
  signOutAction,
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
        <NavUser user={user} signOutAction={signOutAction} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
