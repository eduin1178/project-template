import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { db as defaultDb } from "@/lib/db/client";
import { member, organization, user } from "@/lib/db/schema";

export {
  PLATFORM_ORG_NAME,
  PLATFORM_ORG_SLUG,
} from "./platform-org-constants";

import {
  PLATFORM_ORG_NAME,
  PLATFORM_ORG_SLUG,
} from "./platform-org-constants";

export type PlatformOrgRow = {
  id: string;
  slug: string;
  name: string;
};

export type PlatformMembershipResult = {
  organizationId: string;
  role: "owner";
};

// Accepts the global db or a transaction handle. Both share the same drizzle
// query surface used here (select/insert/where/...). The tx handle lacks
// `$client` so the type is widened to cover both.
type Tx = Parameters<Parameters<typeof defaultDb.transaction>[0]>[0];
export type DbOrTx = typeof defaultDb | Tx;

export async function getOrCreatePlatformOrg(
  executor: DbOrTx = defaultDb,
): Promise<PlatformOrgRow> {
  const existing = await executor
    .select({
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
    })
    .from(organization)
    .where(eq(organization.slug, PLATFORM_ORG_SLUG))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const inserted = await executor
    .insert(organization)
    .values({
      id: randomUUID(),
      slug: PLATFORM_ORG_SLUG,
      name: PLATFORM_ORG_NAME,
      logo: null,
      createdAt: new Date(),
    })
    .onConflictDoNothing({ target: organization.slug })
    .returning({
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
    });

  if (inserted.length > 0) {
    return inserted[0];
  }

  // Lost the race: another caller inserted between our SELECT and INSERT.
  // Re-read and return.
  const reread = await executor
    .select({
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
    })
    .from(organization)
    .where(eq(organization.slug, PLATFORM_ORG_SLUG))
    .limit(1);

  if (reread.length === 0) {
    throw new Error(
      "[platform-org] no se pudo obtener la org plataforma tras INSERT idempotente.",
    );
  }
  return reread[0];
}

export async function ensurePlatformMembership(
  userId: string,
  executor: DbOrTx = defaultDb,
): Promise<PlatformMembershipResult> {
  const org = await getOrCreatePlatformOrg(executor);

  const existing = await executor
    .select({ id: member.id, role: member.role, status: member.status })
    .from(member)
    .where(and(eq(member.organizationId, org.id), eq(member.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    const row = existing[0];
    if (row.status !== "active" || row.role !== "owner") {
      await executor
        .update(member)
        .set({ role: "owner", status: "active" })
        .where(eq(member.id, row.id));
    }
    return { organizationId: org.id, role: "owner" };
  }

  await executor.insert(member).values({
    id: randomUUID(),
    organizationId: org.id,
    userId,
    role: "owner",
    status: "active",
    createdAt: new Date(),
  });

  return { organizationId: org.id, role: "owner" };
}

// Convenience used by setup + accept-invitation flows: ensures membership and
// also points the user's `lastActiveOrganizationId` at the platform org so the
// next login lands them on it without manual selection.
export async function ensurePlatformMembershipAndSetLastActive(
  userId: string,
  executor: DbOrTx = defaultDb,
): Promise<PlatformMembershipResult> {
  const result = await ensurePlatformMembership(userId, executor);
  await executor
    .update(user)
    .set({ lastActiveOrganizationId: result.organizationId })
    .where(eq(user.id, userId));
  return result;
}
