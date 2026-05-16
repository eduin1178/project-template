import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { buildSuperSidebarConfig } from "@/components/layout/contexts/super";
import { auth } from "@/lib/auth/server";
import { loadActiveOrganizationsFor, resolveActiveOrganization } from "@/lib/auth/guards";

export default async function SuperProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "super_admin") {
    notFound();
  }

  const activeOrgs = await loadActiveOrganizationsFor(session.user.id);
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

  return (
    <AppShell
      sidebarConfig={buildSuperSidebarConfig(activeOrg?.slug ?? null)}
      user={{
        name: session.user.name ?? session.user.email,
        email: session.user.email,
        image: session.user.image ?? null,
      }}
      role="super_admin"
      headerLabel="Plataforma Docentix"
    >
      {children}
    </AppShell>
  );
}
