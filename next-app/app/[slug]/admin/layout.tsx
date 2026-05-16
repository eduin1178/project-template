import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { buildAdminSidebarConfig } from "@/components/layout/contexts/admin";
import { switchActiveOrganizationAction } from "@/components/layout/team-switcher-actions";
import {
  isOrgAdmin,
  loadActiveMembershipsFor,
  loadActiveOrganizationsFor,
  requireWorkspaceMemberBySlug,
} from "@/lib/auth/guards";
import { deriveMenuRole } from "@/lib/auth/role-menu";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";

export default async function WorkspaceAdminLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: ReactNode;
}) {
  const { slug } = await params;
  let ctx;
  try {
    ctx = await requireWorkspaceMemberBySlug(slug);
  } catch {
    notFound();
  }

  if (!isOrgAdmin(ctx.role)) {
    redirect(`/${slug}`);
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect(`/login?next=/${slug}/admin`);
  }

  const [memberships, activeOrgs] = await Promise.all([
    loadActiveMembershipsFor(session.user.id),
    loadActiveOrganizationsFor(session.user.id),
  ]);

  return (
    <AppShell
      sidebarConfig={buildAdminSidebarConfig(slug)}
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
        activeOrgId: ctx.orgId,
        onSwitch: switchActiveOrganizationAction,
      }}
      headerLabel="Panel admin"
    >
      {children}
    </AppShell>
  );
}
