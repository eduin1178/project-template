import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { member, organization, user as userTable } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

type LayoutProps = {
  params: Promise<{ slug: string }>;
  children: ReactNode;
};

export default async function SlugWorkspaceLayout({
  params,
  children,
}: LayoutProps) {
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
  if (!org) {
    notFound();
  }

  const [membership] = await db
    .select({ status: member.status })
    .from(member)
    .where(
      and(eq(member.userId, session.user.id), eq(member.organizationId, org.id)),
    )
    .limit(1);
  if (!membership || membership.status !== "active") {
    notFound();
  }

  const sessionActiveOrgId =
    (session.session as { activeOrganizationId?: string | null } | undefined)
      ?.activeOrganizationId ?? null;

  if (sessionActiveOrgId !== org.id) {
    try {
      await auth.api.setActiveOrganization({
        body: { organizationSlug: slug },
        headers: requestHeaders,
      });
      await db
        .update(userTable)
        .set({ lastActiveOrganizationId: org.id })
        .where(eq(userTable.id, session.user.id));
    } catch (err) {
      console.error("[[slug]/layout] persistencia de org activa falló", err);
    }
  }

  return <>{children}</>;
}
