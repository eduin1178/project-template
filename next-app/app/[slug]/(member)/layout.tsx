import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { buildAppSidebarConfig } from "@/components/layout/contexts/app";
import { switchActiveOrganizationAction } from "@/components/layout/team-switcher-actions";
import { auth } from "@/lib/auth/server";
import {
  loadActiveMembershipsFor,
  loadActiveOrganizationsFor,
} from "@/lib/auth/guards";
import { deriveMenuRole } from "@/lib/auth/role-menu";
import { db } from "@/lib/db/client";
import { organization } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function WorkspaceMemberLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: ReactNode;
}) {
  const { slug } = await params;
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) {
    redirect(`/login?next=/${slug}`);
  }

  const [org] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1);
  if (!org) notFound();

  const [memberships, activeOrgs] = await Promise.all([
    loadActiveMembershipsFor(session.user.id),
    loadActiveOrganizationsFor(session.user.id),
  ]);

  return (
    <AppShell
      sidebarConfig={buildAppSidebarConfig(slug)}
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
        activeOrgId: org.id,
        onSwitch: switchActiveOrganizationAction,
      }}
      headerLabel="Mi espacio"
    >
      {children}
    </AppShell>
  );
}
