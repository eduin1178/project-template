"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth/server";
import { requireSession } from "@/lib/auth/guards";
import {
  countAccessMethods,
  hasCredentialAccount,
  listUserAccounts,
} from "@/lib/auth/account-queries";

type ActionResult = { ok: true } | { ok: false; error: string };

const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "El nombre no puede estar vacío."),
  image: z
    .string()
    .trim()
    .url("Debe ser una URL válida.")
    .or(z.literal(""))
    .optional(),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresa tu contraseña actual."),
    newPassword: z
      .string()
      .min(8, "La nueva contraseña debe tener al menos 8 caracteres."),
  })
  .strict();

const setPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres."),
});

const unlinkSchema = z.object({
  providerId: z.string().min(1),
  accountId: z.string().optional(),
});

export async function updateProfileAction(
  input: z.infer<typeof updateProfileSchema>,
): Promise<ActionResult> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  await requireSession();
  try {
    await auth.api.updateUser({
      headers: await headers(),
      body: {
        name: parsed.data.name,
        image: parsed.data.image?.trim() ? parsed.data.image : undefined,
      },
    });
    revalidatePath("/account/profile");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No pudimos actualizar tu perfil.",
    };
  }
}

export async function changePasswordAction(
  input: z.infer<typeof changePasswordSchema>,
): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  await requireSession();
  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "No pudimos cambiar tu contraseña.",
    };
  }
}

export async function setPasswordAction(
  input: z.infer<typeof setPasswordSchema>,
): Promise<ActionResult> {
  const parsed = setPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const session = await requireSession();
  const accounts = await listUserAccounts(session.user.id);
  if (hasCredentialAccount(accounts)) {
    return {
      ok: false,
      error: "Ya tienes una contraseña configurada. Usa el cambio de contraseña.",
    };
  }
  try {
    await auth.api.setPassword({
      headers: await headers(),
      body: { newPassword: parsed.data.newPassword },
    });
    revalidatePath("/account/profile");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "No pudimos establecer tu contraseña.",
    };
  }
}

export async function unlinkAccountAction(
  input: z.infer<typeof unlinkSchema>,
): Promise<ActionResult> {
  const parsed = unlinkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Solicitud inválida." };
  }
  const session = await requireSession();
  const accounts = await listUserAccounts(session.user.id);
  const remaining = accounts.filter(
    (a) => a.providerId !== parsed.data.providerId,
  );
  const methods = countAccessMethods(remaining);
  if (methods < 1) {
    return {
      ok: false,
      error: "No puedes desvincular tu única forma de iniciar sesión.",
    };
  }
  try {
    await auth.api.unlinkAccount({
      headers: await headers(),
      body: {
        providerId: parsed.data.providerId,
        accountId: parsed.data.accountId,
      },
    });
    revalidatePath("/account/profile");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "No pudimos desvincular esta cuenta.",
    };
  }
}
