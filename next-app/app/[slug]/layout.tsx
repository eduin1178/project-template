import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/lib/auth/server";
import { loadActiveMembershipsFor } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { organization, user as userTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

  // Si el usuario no tiene NINGUNA membership activa en cualquier org,
  // lo redirigimos a la ruta informativa antes de revelar (vía notFound)
  // si la org del slug existe o no.
  const activeMemberships = await loadActiveMembershipsFor(session.user.id);
  if (activeMemberships.length === 0) {
    redirect("/no-organization");
  }

  const [org] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1);
  if (!org) {
    notFound();
  }

  const isMemberOfThisOrg = activeMemberships.some(
    (m) => m.organizationId === org.id,
  );
  if (!isMemberOfThisOrg) {
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
