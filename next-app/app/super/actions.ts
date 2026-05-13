"use server";

import { randomBytes } from "node:crypto";

import { z } from "zod";

import { requireSuperAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { superInvitation } from "@/lib/db/schema";
import { sendEmail } from "@/lib/auth/emails";

const inviteSchema = z.object({
  email: z.string().email("Ingresa un email válido."),
});

const INVITATION_TTL_DAYS = 7;

export type InviteResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createSuperInvitationAction(
  _prev: InviteResult | null,
  formData: FormData,
): Promise<InviteResult> {
  const session = await requireSuperAdmin();

  const parsed = inviteSchema.safeParse({
    email: String(formData.get("email") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Email inválido." };
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  await db.insert(superInvitation).values({
    token,
    invitedEmail: parsed.data.email,
    invitedBy: session.user.id,
    expiresAt,
  });

  const baseUrl =
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const url = `${baseUrl}/accept-invitation?token=${token}`;

  await sendEmail({
    to: parsed.data.email,
    subject: "Te invitamos al panel super de Edunet",
    text: `Hola,\n\nTe invitamos a unirte como super admin de Edunet.\n\nAbre este enlace para aceptar la invitación:\n${url}\n\nEl enlace expira en ${INVITATION_TTL_DAYS} días.`,
  });

  return { ok: true };
}
