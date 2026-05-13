"use server";

import { randomUUID } from "node:crypto";

import { headers, cookies } from "next/headers";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { invitation, member, user } from "@/lib/db/schema";

const PENDING_COOKIE = "pending-invitation-id";

const signupSchema = z.object({
  invitationId: z.string().min(1),
  name: z.string().trim().min(1, "Indica tu nombre."),
  email: z.string().trim().email("Ingresa un email válido."),
  password: z.string().min(8, "Mínimo 8 caracteres."),
});

export type AcceptResult = { ok: true } | { ok: false; error: string };

async function loadActiveInvitation(invitationId: string) {
  const [row] = await db
    .select()
    .from(invitation)
    .where(
      and(
        eq(invitation.id, invitationId),
        eq(invitation.status, "pending"),
        gt(invitation.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row;
}

async function acceptForUser(
  invitationId: string,
  userId: string,
): Promise<AcceptResult> {
  try {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(invitation)
        .where(
          and(
            eq(invitation.id, invitationId),
            eq(invitation.status, "pending"),
            gt(invitation.expiresAt, new Date()),
          ),
        )
        .limit(1);
      if (!row) throw new Error("INVALID");

      const updated = await tx
        .update(invitation)
        .set({ status: "accepted" })
        .where(
          and(eq(invitation.id, invitationId), eq(invitation.status, "pending")),
        )
        .returning({ id: invitation.id });
      if (updated.length === 0) throw new Error("RACE");

      await tx.insert(member).values({
        id: randomUUID(),
        organizationId: row.organizationId,
        userId,
        role: row.role ?? "admin",
        createdAt: new Date(),
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID") {
      return { ok: false, error: "La invitación ya no está disponible." };
    }
    if (err instanceof Error && err.message === "RACE") {
      return { ok: false, error: "La invitación ya fue usada." };
    }
    console.error("[accept-org] error", err);
    return { ok: false, error: "No pudimos completar la aceptación." };
  }
  return { ok: true };
}

export async function acceptOrgInvitationLoggedIn(
  invitationId: string,
): Promise<AcceptResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { ok: false, error: "Necesitas iniciar sesión." };
  }

  const row = await loadActiveInvitation(invitationId);
  if (!row) {
    return { ok: false, error: "La invitación ya no está disponible." };
  }

  return acceptForUser(invitationId, session.user.id);
}

export async function acceptOrgInvitationEmailAction(
  _prev: AcceptResult | null,
  formData: FormData,
): Promise<AcceptResult> {
  const parsed = signupSchema.safeParse({
    invitationId: String(formData.get("invitationId") ?? ""),
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

  const row = await loadActiveInvitation(parsed.data.invitationId);
  if (!row) {
    return { ok: false, error: "La invitación ya no está disponible." };
  }

  let createdUserId: string;
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
    console.error("[accept-org] signUpEmail falló", error);
    return {
      ok: false,
      error: "No pudimos crear la cuenta. ¿Ya tienes una cuenta con ese correo?",
    };
  }

  const accept = await acceptForUser(parsed.data.invitationId, createdUserId);
  if (!accept.ok) {
    // best-effort rollback: borrar el usuario recién creado para no dejar huérfanos
    try {
      await db.delete(user).where(eq(user.id, createdUserId));
    } catch (err) {
      console.error("[accept-org] rollback user falló", err);
    }
    return accept;
  }

  void sql;
  return { ok: true };
}

export async function setPendingInvitationCookieAction(invitationId: string) {
  const jar = await cookies();
  jar.set(PENDING_COOKIE, invitationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 15 * 60,
  });
}

export async function consumePendingInvitationCookie(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(PENDING_COOKIE)?.value ?? null;
  if (value) {
    jar.delete(PENDING_COOKIE);
  }
  return value;
}

export async function completeOrgInvitationFromGoogleAction(): Promise<AcceptResult> {
  const invitationId = await consumePendingInvitationCookie();
  if (!invitationId) {
    return {
      ok: false,
      error: "No encontramos la invitación. Vuelve a abrir el link del correo.",
    };
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { ok: false, error: "No detectamos tu sesión. Intenta nuevamente." };
  }

  const row = await loadActiveInvitation(invitationId);
  if (!row) {
    return { ok: false, error: "La invitación ya no está disponible." };
  }

  // isNull import retainer to placate lint if drizzle deps shift
  void isNull;

  return acceptForUser(invitationId, session.user.id);
}
