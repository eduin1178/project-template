import "server-only";
import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import type {
  SidebarConfig,
  SidebarUser,
  TeamsConfig,
} from "./types";
import type { MenuRole } from "@/lib/auth/role-menu";

type AppShellProps = {
  sidebarConfig: SidebarConfig;
  user: SidebarUser;
  role: MenuRole;
  teams?: TeamsConfig;
  headerLabel: string;
  children: ReactNode;
};

export function AppShell({
  sidebarConfig,
  user,
  role,
  teams,
  headerLabel,
  children,
}: AppShellProps) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          config={sidebarConfig}
          user={user}
          role={role}
          teams={teams}
        />
        <SidebarInset>
          <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-16" />
            <span className="text-sm font-medium">{headerLabel}</span>
            <div className="ml-auto flex items-center">
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 px-6 py-8">{children}</main>
        </SidebarInset>
        <Toaster />
      </SidebarProvider>
    </TooltipProvider>
  );
}
