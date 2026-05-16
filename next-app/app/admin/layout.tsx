import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/lib/auth/server";
import {
  loadActiveMembershipsFor,
  loadActiveOrganizationsFor,
  redirectToDashboard,
  resolveActiveOrganization,
} from "@/lib/auth/guards";
import { deriveMenuRole } from "@/lib/auth/role-menu";
import { db } from "@/lib/db/client";
import { user as userTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { adminSidebarConfig } from "@/components/layout/contexts/admin";
import { switchActiveOrganizationAction } from "@/components/layout/team-switcher-actions";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) {
    redirect("/login");
  }
  const memberships = await loadActiveMembershipsFor(session.user.id);
  const activeOrgs = await loadActiveOrganizationsFor(session.user.id);
  if (activeOrgs.length === 0) {
    redirect("/account/organizations");
  }

  const sessionActiveOrgId =
    (session.session as { activeOrganizationId?: string | null } | undefined)
      ?.activeOrganizationId ?? null;
  const lastActiveOrgId =
    (session.user as { lastActiveOrganizationId?: string | null })
      .lastActiveOrganizationId ?? null;

  const resolved = resolveActiveOrganization({
    sessionActiveOrgId,
    lastActiveOrgId,
    activeOrgs,
  });

  if (resolved.activeOrgRole !== "owner" && resolved.activeOrgRole !== "admin") {
    await redirectToDashboard();
  }

  if (resolved.needsPersist && resolved.activeOrgId) {
    try {
      await auth.api.setActiveOrganization({
        body: { organizationId: resolved.activeOrgId },
        headers: requestHeaders,
      });
      await db
        .update(userTable)
        .set({ lastActiveOrganizationId: resolved.activeOrgId })
        .where(eq(userTable.id, session.user.id));
    } catch (err) {
      console.error("[admin/layout] persistencia de org activa falló", err);
    }
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          config={adminSidebarConfig}
          user={{
            name: session.user.name ?? session.user.email,
            email: session.user.email,
            image: session.user.image ?? null,
          }}
          role={deriveMenuRole(session, memberships)}
          teams={{
            orgs: activeOrgs.map((o) => ({
              id: o.id,
              slug: o.slug,
              name: o.name,
              logo: o.logo,
            })),
            activeOrgId: resolved.activeOrgId,
            onSwitch: switchActiveOrganizationAction,
          }}
        />
        <SidebarInset>
          <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-16" />
            <span className="text-sm font-medium">Panel admin</span>
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
