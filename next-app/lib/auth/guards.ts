import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db/client";
import { member, organization } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";

import { auth } from "./server";

export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getCurrentSession();
  if (!session?.user) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}

export async function requireSuperAdmin() {
  const session = await getCurrentSession();
  if (!session?.user || session.user.role !== "super_admin") {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function requireTenantAdmin() {
  const session = await requireSession();
  const memberships = await db
    .select({ role: member.role })
    .from(member)
    .where(eq(member.userId, session.user.id));
  const isAdmin = memberships.some(
    (m) => m.role === "admin" || m.role === "owner",
  );
  if (!isAdmin) {
    throw new Error("FORBIDDEN");
  }
  return { session, memberships };
}

export type OrgAdminContext = {
  userId: string;
  orgId: string;
  role: "admin" | "owner";
};

export async function requireOrgAdmin(): Promise<OrgAdminContext> {
  const session = await requireSession();
  const activeOrgId =
    (session.session as { activeOrganizationId?: string | null } | undefined)
      ?.activeOrganizationId ?? null;
  if (!activeOrgId) {
    throw new Error("FORBIDDEN");
  }
  const [row] = await db
    .select({ role: member.role, status: member.status })
    .from(member)
    .where(
      and(
        eq(member.userId, session.user.id),
        eq(member.organizationId, activeOrgId),
      ),
    )
    .limit(1);
  if (
    !row ||
    row.status !== "active" ||
    (row.role !== "admin" && row.role !== "owner")
  ) {
    throw new Error("FORBIDDEN");
  }
  return {
    userId: session.user.id,
    orgId: activeOrgId,
    role: row.role as "admin" | "owner",
  };
}

export async function requireAnyUser() {
  return requireSession();
}

export async function loadMembershipsFor(userId: string) {
  return db
    .select({
      role: member.role,
      organizationId: member.organizationId,
      status: member.status,
    })
    .from(member)
    .where(eq(member.userId, userId));
}

export async function loadActiveMembershipsFor(userId: string) {
  return db
    .select({ role: member.role, organizationId: member.organizationId })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.status, "active")));
}

export type ActiveOrgSummary = {
  id: string;
  name: string;
  logo: string | null;
  role: string;
};

export async function loadActiveOrganizationsFor(
  userId: string,
): Promise<ActiveOrgSummary[]> {
  const rows = await db
    .select({
      id: organization.id,
      name: organization.name,
      logo: organization.logo,
      role: member.role,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(and(eq(member.userId, userId), eq(member.status, "active")))
    .orderBy(asc(organization.name));
  return rows;
}

export type ResolveActiveOrgArgs = {
  sessionActiveOrgId: string | null | undefined;
  lastActiveOrgId: string | null | undefined;
  activeOrgs: ActiveOrgSummary[];
};

export type ResolveActiveOrgResult = {
  activeOrgId: string | null;
  needsPersist: boolean;
};

export function resolveActiveOrganization({
  sessionActiveOrgId,
  lastActiveOrgId,
  activeOrgs,
}: ResolveActiveOrgArgs): ResolveActiveOrgResult {
  const ids = new Set(activeOrgs.map((o) => o.id));
  if (sessionActiveOrgId && ids.has(sessionActiveOrgId)) {
    return { activeOrgId: sessionActiveOrgId, needsPersist: false };
  }
  if (lastActiveOrgId && ids.has(lastActiveOrgId)) {
    return { activeOrgId: lastActiveOrgId, needsPersist: true };
  }
  if (activeOrgs.length > 0) {
    return { activeOrgId: activeOrgs[0].id, needsPersist: true };
  }
  return { activeOrgId: null, needsPersist: false };
}

export async function redirectToDashboard() {
  const session = await getCurrentSession();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role === "super_admin") redirect("/super");
  const memberships = await loadActiveMembershipsFor(session.user.id);
  const isTenantAdmin = memberships.some(
    (m) => m.role === "admin" || m.role === "owner",
  );
  redirect(isTenantAdmin ? "/admin" : "/app");
}
