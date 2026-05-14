import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/lib/auth/server";
import { loadActiveMembershipsFor } from "@/lib/auth/guards";
import { deriveMenuRole } from "@/lib/auth/role-menu";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { appSidebarConfig } from "@/components/layout/contexts/app";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role === "super_admin") {
    redirect("/super");
  }
  const memberships = await loadActiveMembershipsFor(session.user.id);
  const isTenantAdmin = memberships.some(
    (m) => m.role === "admin" || m.role === "owner",
  );
  if (isTenantAdmin) {
    redirect("/admin");
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          config={appSidebarConfig}
          user={{
            name: session.user.name ?? session.user.email,
            email: session.user.email,
            image: session.user.image ?? null,
          }}
          role={deriveMenuRole(session, memberships)}
        />
        <SidebarInset>
          <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-16" />
            <span className="text-sm font-medium">Mi espacio</span>
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
