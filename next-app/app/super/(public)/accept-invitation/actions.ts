"use server";

import { headers } from "next/headers";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/lib/auth/server";
import { ensurePlatformMembershipAndSetLastActive } from "@/lib/auth/platform-org";
import { db } from "@/lib/db/client";
import { superInvitation, user } from "@/lib/db/schema";

const acceptSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1, "Indica tu nombre."),
  email: z.string().email("Ingresa un email válido."),
  password: z.string().min(8, "Mínimo 8 caracteres."),
});

export type AcceptResult =
  | { ok: true }
  | { ok: false; error: string };

export async function acceptSuperInvitationEmailAction(
  _prev: AcceptResult | null,
  formData: FormData,
): Promise<AcceptResult> {
  const parsed = acceptSchema.safeParse({
    token: String(formData.get("token") ?? ""),
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  // Re-valida que la invitación siga vigente
  const [invitation] = await db
    .select()
    .from(superInvitation)
    .where(
      and(
        eq(superInvitation.token, parsed.data.token),
        isNull(superInvitation.acceptedAt),
        gt(superInvitation.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!invitation) {
    return {
      ok: false,
      error: "La invitación ya fue usada o expiró.",
    };
  }

  let createdUserId: string | null = null;
  try {
    const result = await auth.api.signUpEmail({
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
      },
      headers: await headers(),
    });
    createdUserId = result.user.id;
  } catch (error) {
    console.error("[invitation] signUpEmail falló", error);
    return {
      ok: false,
      error: "No pudimos crear la cuenta. ¿Ya tienes una cuenta con ese correo?",
    };
  }

  // Promover a super_admin, enrolar en org plataforma y marcar invitación
  // aceptada atómicamente.
  await db.transaction(async (tx) => {
    await tx
      .update(user)
      .set({ role: "super_admin" })
      .where(eq(user.id, createdUserId!));

    const updated = await tx
      .update(superInvitation)
      .set({ acceptedAt: new Date(), acceptedBy: createdUserId })
      .where(
        and(
          eq(superInvitation.id, invitation.id),
          isNull(superInvitation.acceptedAt),
        ),
      )
      .returning({ id: superInvitation.id });

    if (updated.length === 0) {
      // race: alguien aceptó primero. revertir rol y borrar usuario.
      await tx.delete(user).where(eq(user.id, createdUserId!));
      throw new Error("RACE");
    }

    await ensurePlatformMembershipAndSetLastActive(createdUserId!, tx);
  }).catch((err) => {
    console.error("[invitation] acceptance race", err);
    throw err;
  });

  return { ok: true };
}

// Para el flujo Google: ya hay sesión, completamos la asignación de rol.
export async function completeInvitationFromGoogleAction(
  token: string,
): Promise<AcceptResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { ok: false, error: "No detectamos tu sesión. Intenta nuevamente." };
  }

  const [invitation] = await db
    .select()
    .from(superInvitation)
    .where(
      and(
        eq(superInvitation.token, token),
        isNull(superInvitation.acceptedAt),
        gt(superInvitation.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!invitation) {
    return { ok: false, error: "La invitación ya fue usada o expiró." };
  }

  let platformOrgId: string | null = null;
  await db.transaction(async (tx) => {
    await tx
      .update(user)
      .set({ role: "super_admin" })
      .where(eq(user.id, session.user.id));

    const updated = await tx
      .update(superInvitation)
      .set({ acceptedAt: new Date(), acceptedBy: session.user.id })
      .where(
        and(
          eq(superInvitation.id, invitation.id),
          isNull(superInvitation.acceptedAt),
        ),
      )
      .returning({ id: superInvitation.id });
    if (updated.length === 0) {
      throw new Error("RACE");
    }

    const result = await ensurePlatformMembershipAndSetLastActive(
      session.user.id,
      tx,
    );
    platformOrgId = result.organizationId;
  });

  // El flujo Google ya tiene sesión activa; apuntá la sesión a la org
  // plataforma para que `/post-login` y `/super` rindan inmediatamente.
  if (platformOrgId) {
    try {
      await auth.api.setActiveOrganization({
        body: { organizationId: platformOrgId },
        headers: await headers(),
      });
    } catch (err) {
      console.error(
        "[invitation/google] setActiveOrganization falló (no bloqueante)",
        err,
      );
    }
  }

  // Touch sql to keep import used; remove if not needed
  void sql;
  return { ok: true };
}
