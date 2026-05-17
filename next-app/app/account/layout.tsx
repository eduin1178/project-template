import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { AccountHeaderLabel } from "@/components/layout/account-header-label";
import { buildAppSidebarConfig } from "@/components/layout/contexts/app";
import { buildAccountFallbackSidebarConfig } from "@/components/layout/contexts/account";
import { switchActiveOrganizationAction } from "@/components/layout/team-switcher-actions";
import { auth } from "@/lib/auth/server";
import {
  loadActiveMembershipsFor,
  resolveActiveOrgForShell,
} from "@/lib/auth/guards";
import { deriveMenuRole } from "@/lib/auth/role-menu";

export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  const sessionActiveOrgId =
    (session.session as { activeOrganizationId?: string | null } | undefined)
      ?.activeOrganizationId ?? null;
  const lastActiveOrgId =
    (session.user as { lastActiveOrganizationId?: string | null })
      .lastActiveOrganizationId ?? null;

  const [memberships, shellOrg] = await Promise.all([
    loadActiveMembershipsFor(session.user.id),
    resolveActiveOrgForShell(session.user.id, sessionActiveOrgId, lastActiveOrgId),
  ]);

  const sidebarConfig = shellOrg.activeOrgSlug
    ? buildAppSidebarConfig(shellOrg.activeOrgSlug)
    : buildAccountFallbackSidebarConfig();

  return (
    <AppShell
      sidebarConfig={sidebarConfig}
      user={{
        name: session.user.name ?? session.user.email,
        email: session.user.email,
        image: session.user.image ?? null,
      }}
      role={deriveMenuRole(session, memberships)}
      teams={{
        orgs: shellOrg.orgs.map((o) => ({
          id: o.id,
          slug: o.slug,
          name: o.name,
          logo: o.logo,
        })),
        activeOrgId: shellOrg.activeOrgId,
        onSwitch: switchActiveOrganizationAction,
      }}
      headerLabel={<AccountHeaderLabel />}
    >
      {children}
    </AppShell>
  );
}
