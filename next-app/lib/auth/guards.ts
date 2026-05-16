import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db/client";
import { member, organization } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";

import { ensurePlatformMembership } from "./platform-org";
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

export type OrgMemberRole = "owner" | "admin" | "member";

export type OrgMemberContext = {
  userId: string;
  orgId: string;
  role: OrgMemberRole;
};

export function isOrgAdmin(role: OrgMemberRole): boolean {
  return role === "admin" || role === "owner";
}

export async function requireOrgMember(): Promise<OrgMemberContext> {
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
  if (!row || row.status !== "active") {
    throw new Error("FORBIDDEN");
  }
  const role = row.role as OrgMemberRole;
  if (role !== "owner" && role !== "admin" && role !== "member") {
    throw new Error("FORBIDDEN");
  }
  return {
    userId: session.user.id,
    orgId: activeOrgId,
    role,
  };
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
  activeOrgRole: OrgMemberRole | null;
  needsPersist: boolean;
};

function normalizeOrgRole(role: string | null | undefined): OrgMemberRole | null {
  if (role === "owner" || role === "admin" || role === "member") return role;
  return null;
}

export function resolveActiveOrganization({
  sessionActiveOrgId,
  lastActiveOrgId,
  activeOrgs,
}: ResolveActiveOrgArgs): ResolveActiveOrgResult {
  const byId = new Map(activeOrgs.map((o) => [o.id, o]));
  if (sessionActiveOrgId && byId.has(sessionActiveOrgId)) {
    return {
      activeOrgId: sessionActiveOrgId,
      activeOrgRole: normalizeOrgRole(byId.get(sessionActiveOrgId)!.role),
      needsPersist: false,
    };
  }
  if (lastActiveOrgId && byId.has(lastActiveOrgId)) {
    return {
      activeOrgId: lastActiveOrgId,
      activeOrgRole: normalizeOrgRole(byId.get(lastActiveOrgId)!.role),
      needsPersist: true,
    };
  }
  if (activeOrgs.length > 0) {
    return {
      activeOrgId: activeOrgs[0].id,
      activeOrgRole: normalizeOrgRole(activeOrgs[0].role),
      needsPersist: true,
    };
  }
  return { activeOrgId: null, activeOrgRole: null, needsPersist: false };
}

export async function redirectToDashboard() {
  const session = await getCurrentSession();
  if (!session?.user) {
    redirect("/login");
  }

  const sessionActiveOrgId =
    (session.session as { activeOrganizationId?: string | null } | undefined)
      ?.activeOrganizationId ?? null;
  const lastActiveOrgId =
    (session.user as { lastActiveOrganizationId?: string | null })
      .lastActiveOrganizationId ?? null;
  let activeOrgs = await loadActiveOrganizationsFor(session.user.id);
  let { activeOrgRole } = resolveActiveOrganization({
    sessionActiveOrgId,
    lastActiveOrgId,
    activeOrgs,
  });

  // Defensa en profundidad: tras el seed/hook todo super debería tener
  // membership activa en la org plataforma. Si por algún motivo no la tiene
  // (bug, borrado manual de fila en `member`), intentamos auto-repararla
  // una vez antes de caer a `/super`.
  if (session.user.role === "super_admin" && activeOrgRole === null) {
    console.error(
      "[guards] super_admin sin membresía activa detectado; intentando auto-reparar via ensurePlatformMembership.",
      { userId: session.user.id },
    );
    try {
      await ensurePlatformMembership(session.user.id);
      activeOrgs = await loadActiveOrganizationsFor(session.user.id);
      ({ activeOrgRole } = resolveActiveOrganization({
        sessionActiveOrgId,
        lastActiveOrgId,
        activeOrgs,
      }));
    } catch (err) {
      console.error("[guards] auto-reparación de membership falló", err);
    }
    if (activeOrgRole === null) {
      redirect("/super");
    }
  }

  if (activeOrgRole === null) {
    redirect("/account/organizations");
  }
  if (activeOrgRole === "owner" || activeOrgRole === "admin") {
    redirect("/admin");
  }
  redirect("/app");
}
