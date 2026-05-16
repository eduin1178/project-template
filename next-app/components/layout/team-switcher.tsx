"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CaretUpDownIcon, CheckIcon } from "@phosphor-icons/react";
import { toast } from "sonner";

import { OrgAvatar } from "@/components/organizations/org-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import type { TeamsConfig } from "./types";

export function TeamSwitcher({ teams }: { teams: TeamsConfig }) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const activeOrg =
    teams.orgs.find((o) => o.id === teams.activeOrgId) ?? teams.orgs[0] ?? null;

  function handleSwitch(orgId: string) {
    if (orgId === teams.activeOrgId || pending) return;
    startTransition(async () => {
      const result = await teams.onSwitch(orgId);
      if (result.ok) {
        toast.success("Cambiaste de institución.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (!activeOrg) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              disabled={pending}
            >
              <OrgAvatar
                name={activeOrg.name}
                logo={activeOrg.logo}
                className="size-8 rounded-lg"
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeOrg.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  Institución activa
                </span>
              </div>
              <CaretUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Cambiar de institución
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {teams.orgs.map((org) => {
              const isActive = org.id === teams.activeOrgId;
              return (
                <DropdownMenuItem
                  key={org.id}
                  onSelect={(event) => {
                    event.preventDefault();
                    handleSwitch(org.id);
                  }}
                  className="gap-2"
                >
                  <OrgAvatar
                    name={org.name}
                    logo={org.logo}
                    className="size-6 rounded-md"
                  />
                  <span className="truncate">{org.name}</span>
                  {isActive ? (
                    <CheckIcon className="ml-auto size-4" />
                  ) : null}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
