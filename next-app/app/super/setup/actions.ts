"use server";

import { timingSafeEqual } from "node:crypto";

import { headers } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/schema";

const schema = z.object({
  name: z.string().min(1, "Indica tu nombre."),
  email: z.string().email("Ingresa un email válido."),
  password: z.string().min(8, "Mínimo 8 caracteres."),
  setupToken: z.string().min(1, "Indica el token de setup."),
});

export type SetupResult =
  | { ok: true }
  | { ok: false; error: string };

function safeEq(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function bootstrapFirstSuperAdminAction(
  _prev: SetupResult | null,
  formData: FormData,
): Promise<SetupResult> {
  const parsed = schema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    setupToken: String(formData.get("setupToken") ?? ""),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const envToken = process.env.SUPER_ADMIN_SETUP_TOKEN;
  if (!envToken) {
    console.error("[setup] SUPER_ADMIN_SETUP_TOKEN no está configurada.");
    return { ok: false, error: "Configuración incompleta en el servidor." };
  }
  if (!safeEq(parsed.data.setupToken, envToken)) {
    return { ok: false, error: "Token de setup incorrecto." };
  }

  // Lock + count check
  let alreadyExists = false;
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext('super_admin_setup'))`,
    );
    const [row] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(user)
      .where(sql`${user.role} = 'super_admin'`);
    if ((row?.count ?? 0) > 0) {
      alreadyExists = true;
    }
  });
  if (alreadyExists) {
    return { ok: false, error: "Ya existe un super admin registrado." };
  }

  // Create user via better-auth
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
    console.error("[setup] signUpEmail falló", error);
    return {
      ok: false,
      error: "No pudimos crear la cuenta. Intenta nuevamente.",
    };
  }

  // Promote to super_admin only if no super admin exists yet (race guard)
  const updated = await db
    .update(user)
    .set({ role: "super_admin" })
    .where(
      and(
        eq(user.id, createdUserId),
        sql`NOT EXISTS (SELECT 1 FROM "user" u2 WHERE u2.role = 'super_admin')`,
      ),
    )
    .returning({ id: user.id });

  if (updated.length === 0) {
    // Race: otro super se creó antes. Revertimos eliminando la cuenta.
    await db.delete(user).where(eq(user.id, createdUserId));
    return { ok: false, error: "Ya existe un super admin registrado." };
  }

  return { ok: true };
}
