import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db/client";
import { member } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

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
