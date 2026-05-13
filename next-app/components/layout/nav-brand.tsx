"use client";

import Link from "next/link";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import type { SidebarBrand } from "./types";

export function NavBrand({ brand }: { brand: SidebarBrand }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild size="lg">
          <Link href={brand.href}>
            {brand.icon ? (
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                {brand.icon}
              </div>
            ) : null}
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{brand.label}</span>
              {brand.description ? (
                <span className="text-muted-foreground truncate text-xs">
                  {brand.description}
                </span>
              ) : null}
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
