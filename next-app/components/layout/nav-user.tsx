"use client";

import Link from "next/link";
import {
  BuildingsIcon,
  CaretUpDownIcon,
  EnvelopeSimpleIcon,
  UserIcon,
} from "@phosphor-icons/react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
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
import {
  getUserMenuItems,
  type MenuItemKey,
  type MenuRole,
} from "@/lib/auth/role-menu";

import { SignOutMenuItem } from "./sign-out-menu-item";
import type { SidebarUser } from "./types";

function getInitials(user: SidebarUser) {
  const source = user.name?.trim() || user.email;
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const ICONS: Record<Exclude<MenuItemKey, "sign-out">, React.ElementType> = {
  profile: UserIcon,
  organizations: BuildingsIcon,
  invitations: EnvelopeSimpleIcon,
};

export function NavUser({
  user,
  role,
}: {
  user: SidebarUser;
  role: MenuRole;
}) {
  const { isMobile } = useSidebar();
  const initials = getInitials(user);
  const items = getUserMenuItems(role);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {user.image ? (
                  <AvatarImage src={user.image} alt={user.name} />
                ) : null}
                <AvatarFallback className="rounded-lg">{initials || "U"}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
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
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  {user.image ? (
                    <AvatarImage src={user.image} alt={user.name} />
                  ) : null}
                  <AvatarFallback className="rounded-lg">{initials || "U"}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {items
              .filter((item) => item.key !== "sign-out")
              .map((item) => {
                const Icon = ICONS[item.key as Exclude<MenuItemKey, "sign-out">];
                return (
                  <DropdownMenuItem key={item.key} asChild>
                    <Link href={item.href ?? "#"}>
                      <Icon />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            <DropdownMenuSeparator />
            <SignOutMenuItem />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
