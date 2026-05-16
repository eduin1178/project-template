"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { auth } from "@/lib/auth/server";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { member, organization, user } from "@/lib/db/schema";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function switchActiveOrganizationAction(
  organizationSlug: string,
): Promise<ActionResult> {
  if (!organizationSlug || typeof organizationSlug !== "string") {
    return { ok: false, error: "Solicitud inválida." };
  }

  let session;
  try {
    session = await requireSession();
  } catch {
    return { ok: false, error: "Sesión no válida." };
  }

  const [org] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, organizationSlug))
    .limit(1);

  if (!org) {
    return { ok: false, error: "Esa institución no existe." };
  }

  const [row] = await db
    .select({ status: member.status })
    .from(member)
    .where(
      and(
        eq(member.organizationId, org.id),
        eq(member.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!row || row.status !== "active") {
    return {
      ok: false,
      error: "No tienes acceso a esa institución.",
    };
  }

  try {
    await auth.api.setActiveOrganization({
      body: { organizationSlug },
      headers: await headers(),
    });
  } catch (err) {
    console.error("[team-switcher] setActiveOrganization falló", err);
    return { ok: false, error: "No pudimos cambiar de institución." };
  }

  try {
    await db
      .update(user)
      .set({ lastActiveOrganizationId: org.id })
      .where(eq(user.id, session.user.id));
  } catch (err) {
    console.error("[team-switcher] update lastActiveOrganizationId falló", err);
  }

  revalidatePath("/");
  return { ok: true };
}
