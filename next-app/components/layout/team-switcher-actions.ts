"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { auth } from "@/lib/auth/server";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { member, user } from "@/lib/db/schema";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function switchActiveOrganizationAction(
  organizationId: string,
): Promise<ActionResult> {
  if (!organizationId || typeof organizationId !== "string") {
    return { ok: false, error: "Solicitud inválida." };
  }

  let session;
  try {
    session = await requireSession();
  } catch {
    return { ok: false, error: "Sesión no válida." };
  }

  const [row] = await db
    .select({ status: member.status })
    .from(member)
    .where(
      and(
        eq(member.organizationId, organizationId),
        eq(member.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!row || row.status !== "active") {
    return {
      ok: false,
      error: "No tienes acceso a esa organización.",
    };
  }

  try {
    await auth.api.setActiveOrganization({
      body: { organizationId },
      headers: await headers(),
    });
  } catch (err) {
    console.error("[team-switcher] setActiveOrganization falló", err);
    return { ok: false, error: "No pudimos cambiar de organización." };
  }

  try {
    await db
      .update(user)
      .set({ lastActiveOrganizationId: organizationId })
      .where(eq(user.id, session.user.id));
  } catch (err) {
    console.error("[team-switcher] update lastActiveOrganizationId falló", err);
  }

  revalidatePath("/");
  return { ok: true };
}
