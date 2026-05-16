import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";

import { auth } from "@/lib/auth/server";
import {
  loadActiveOrganizationsFor,
  loadMembershipsFor,
  resolveActiveOrganization,
} from "@/lib/auth/guards";
import { deriveDashboardHref } from "@/lib/auth/derive-dashboard-href";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  const [memberships, activeOrgs] = await Promise.all([
    loadMembershipsFor(session.user.id),
    loadActiveOrganizationsFor(session.user.id),
  ]);

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
  const activeOrg = activeOrgs.find((o) => o.id === resolved.activeOrgId) ?? null;

  const backHref = deriveDashboardHref({
    user: { role: session.user.role ?? null },
    memberships,
    activeOrgRole: resolved.activeOrgRole,
    activeOrgSlug: activeOrg?.slug ?? null,
  });

  return (
    <TooltipProvider>
      <div className="bg-background text-foreground min-h-screen">
        <header className="bg-background sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b px-6">
          <Link
            href={backHref}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeftIcon className="size-4" />
            Volver al panel
          </Link>
          <span className="bg-border h-4 w-px" aria-hidden />
          <h1 className="text-sm font-medium">Mi cuenta</h1>
          <div className="ml-auto flex items-center">
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl px-6 py-8">{children}</main>
        <Toaster />
      </div>
    </TooltipProvider>
  );
}
