"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { sendTenantInvitationEmail } from "@/lib/auth/emails";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { invitation, member, organization } from "@/lib/db/schema";
import {
  buildLogoKey,
  deletePublicAsset,
  extractKeyFromPublicUrl,
  uploadPublicAsset,
} from "@/lib/storage/r2";

const INVITATION_TTL_DAYS = 7;
const MAX_LOGO_BYTES = 1024 * 1024;
const ALLOWED_LOGO_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);
const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireTenantAdminFor(organizationId: string) {
  const session = await requireSession();
  const [row] = await db
    .select({ role: member.role, status: member.status })
    .from(member)
    .where(
      and(
        eq(member.organizationId, organizationId),
        eq(member.userId, session.user.id),
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
  return session;
}

const updateOrgSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().trim().min(1, "El nombre no puede estar vacío."),
});

export async function updateOrganizationAction(
  input: z.infer<typeof updateOrgSchema>,
): Promise<ActionResult> {
  const parsed = updateOrgSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  try {
    await requireTenantAdminFor(parsed.data.organizationId);
  } catch {
    return { ok: false, error: "No tienes permisos para editar esta institución." };
  }
  try {
    await db
      .update(organization)
      .set({ name: parsed.data.name })
      .where(eq(organization.id, parsed.data.organizationId));
    revalidatePath(`/account/organizations/${parsed.data.organizationId}`);
    revalidatePath("/account/organizations");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "No pudimos actualizar la institución.",
    };
  }
}

export async function uploadOrganizationLogoAction(
  formData: FormData,
): Promise<ActionResult> {
  const organizationId = String(formData.get("organizationId") ?? "");
  const file = formData.get("file");
  if (!organizationId) {
    return { ok: false, error: "Solicitud inválida." };
  }
  if (!(file instanceof File)) {
    return { ok: false, error: "Selecciona un archivo." };
  }
  if (!ALLOWED_LOGO_MIME.has(file.type)) {
    return {
      ok: false,
      error: "Formato no soportado. Usa PNG, JPEG, WebP o SVG.",
    };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return {
      ok: false,
      error: "El archivo supera el tamaño máximo de 1 MB.",
    };
  }
  try {
    await requireTenantAdminFor(organizationId);
  } catch {
    return { ok: false, error: "No tienes permisos para editar esta institución." };
  }

  const [existing] = await db
    .select({ logo: organization.logo })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  const ext = MIME_TO_EXT[file.type] ?? "bin";
  const key = buildLogoKey(organizationId, ext);
  const buffer = Buffer.from(await file.arrayBuffer());

  let uploadedUrl: string;
  try {
    const result = await uploadPublicAsset({
      key,
      body: buffer,
      contentType: file.type,
    });
    uploadedUrl = result.url;
  } catch (err) {
    console.error("[orgs] upload logo falló", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "No pudimos subir el logo.",
    };
  }

  try {
    await db
      .update(organization)
      .set({ logo: uploadedUrl })
      .where(eq(organization.id, organizationId));
  } catch (err) {
    console.error("[orgs] update logo en BD falló", err);
    return { ok: false, error: "No pudimos guardar el logo." };
  }

  if (existing?.logo) {
    const previousKey = extractKeyFromPublicUrl(existing.logo);
    if (previousKey) {
      try {
        await deletePublicAsset({ key: previousKey });
      } catch (err) {
        console.warn("[orgs] no se pudo borrar logo previo", err);
      }
    }
  }

  revalidatePath(`/account/organizations/${organizationId}`);
  revalidatePath("/account/organizations");
  return { ok: true };
}

const createInvitationSchema = z.object({
  organizationId: z.string().min(1),
  email: z.string().trim().email("Ingresa un email válido."),
  role: z.enum(["admin", "member"]),
});

export async function createTenantInvitationAction(
  input: z.infer<typeof createInvitationSchema>,
): Promise<ActionResult> {
  const parsed = createInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  let session;
  try {
    session = await requireTenantAdminFor(parsed.data.organizationId);
  } catch {
    return { ok: false, error: "No tienes permisos en esta institución." };
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
  const [duplicate] = await db
    .select({ id: invitation.id })
    .from(invitation)
    .where(
      and(
        eq(invitation.organizationId, parsed.data.organizationId),
        eq(invitation.email, normalizedEmail),
        eq(invitation.status, "pending"),
      ),
    )
    .limit(1);
  if (duplicate) {
    return {
      ok: false,
      error: "Ya existe una invitación pendiente para este email.",
    };
  }

  const invitationId = randomUUID();
  const expiresAt = new Date(
    Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  await db.insert(invitation).values({
    id: invitationId,
    organizationId: parsed.data.organizationId,
    email: normalizedEmail,
    role: parsed.data.role,
    status: "pending",
    expiresAt,
    inviterId: session.user.id,
  });

  const [org] = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, parsed.data.organizationId))
    .limit(1);

  try {
    await sendTenantInvitationEmail({
      to: normalizedEmail,
      organizationName: org?.name ?? "tu institución",
      role: parsed.data.role,
      invitationId,
      ttlDays: INVITATION_TTL_DAYS,
      inviterName: session.user.name || session.user.email,
    });
  } catch (err) {
    console.error("[orgs] envío de email de invitación tenant falló", err);
  }

  revalidatePath(`/account/organizations/${parsed.data.organizationId}`);
  return { ok: true };
}

export async function resendTenantInvitationAction(
  invitationId: string,
): Promise<ActionResult> {
  const [row] = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      organizationId: invitation.organizationId,
    })
    .from(invitation)
    .where(eq(invitation.id, invitationId))
    .limit(1);
  if (!row) return { ok: false, error: "La invitación no existe." };
  let session;
  try {
    session = await requireTenantAdminFor(row.organizationId);
  } catch {
    return { ok: false, error: "No tienes permisos en esta institución." };
  }
  if (row.status !== "pending") {
    return { ok: false, error: "Esta invitación ya no está pendiente." };
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    return {
      ok: false,
      error: "La invitación ya expiró. Elimínala y crea una nueva.",
    };
  }

  const [org] = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, row.organizationId))
    .limit(1);

  try {
    await sendTenantInvitationEmail({
      to: row.email,
      organizationName: org?.name ?? "tu institución",
      role: row.role ?? "member",
      invitationId: row.id,
      ttlDays: Math.max(
        1,
        Math.ceil(
          (row.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
        ),
      ),
      inviterName: session.user.name || session.user.email,
    });
  } catch (err) {
    console.error("[orgs] reenvío falló", err);
    return { ok: false, error: "No pudimos reenviar el email." };
  }
  return { ok: true };
}

const updateMemberRoleSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(["admin", "member"]),
});

export async function updateMemberRoleAction(
  input: z.infer<typeof updateMemberRoleSchema>,
): Promise<ActionResult> {
  const parsed = updateMemberRoleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const [target] = await db
    .select({
      id: member.id,
      organizationId: member.organizationId,
      userId: member.userId,
      role: member.role,
      status: member.status,
    })
    .from(member)
    .where(eq(member.id, parsed.data.memberId))
    .limit(1);
  if (!target) return { ok: false, error: "El miembro no existe." };

  let session;
  try {
    session = await requireTenantAdminFor(target.organizationId);
  } catch {
    return { ok: false, error: "No tienes permisos en esta institución." };
  }

  if (target.userId === session.user.id) {
    return { ok: false, error: "No puedes cambiar tu propio rol." };
  }

  const isTargetPrivileged =
    target.role === "admin" || target.role === "owner";
  if (parsed.data.role === "member" && isTargetPrivileged) {
    const survivors = await db
      .select({ id: member.id })
      .from(member)
      .where(
        and(
          eq(member.organizationId, target.organizationId),
          eq(member.status, "active"),
          inArray(member.role, ["admin", "owner"]),
        ),
      );
    const otherActiveAdmins = survivors.filter((m) => m.id !== target.id);
    if (otherActiveAdmins.length === 0) {
      return {
        ok: false,
        error:
          "No puedes degradar al último admin activo de la institución.",
      };
    }
  }

  if (parsed.data.role === target.role) {
    return { ok: true };
  }

  await db
    .update(member)
    .set({ role: parsed.data.role })
    .where(eq(member.id, target.id));
  revalidatePath(`/account/organizations/${target.organizationId}`);
  return { ok: true };
}

const setMemberStatusSchema = z.object({
  memberId: z.string().min(1),
  status: z.enum(["active", "inactive"]),
});

export async function setMemberStatusAction(
  input: z.infer<typeof setMemberStatusSchema>,
): Promise<ActionResult> {
  const parsed = setMemberStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const [target] = await db
    .select({
      id: member.id,
      organizationId: member.organizationId,
      userId: member.userId,
      role: member.role,
      status: member.status,
    })
    .from(member)
    .where(eq(member.id, parsed.data.memberId))
    .limit(1);
  if (!target) return { ok: false, error: "El miembro no existe." };

  let session;
  try {
    session = await requireTenantAdminFor(target.organizationId);
  } catch {
    return { ok: false, error: "No tienes permisos en esta institución." };
  }

  if (target.userId === session.user.id) {
    return { ok: false, error: "No puedes suspender tu propio acceso." };
  }

  const isTargetPrivileged =
    target.role === "admin" || target.role === "owner";
  if (parsed.data.status === "inactive" && isTargetPrivileged) {
    const survivors = await db
      .select({ id: member.id })
      .from(member)
      .where(
        and(
          eq(member.organizationId, target.organizationId),
          eq(member.status, "active"),
          inArray(member.role, ["admin", "owner"]),
        ),
      );
    const otherActiveAdmins = survivors.filter((m) => m.id !== target.id);
    if (otherActiveAdmins.length === 0) {
      return {
        ok: false,
        error:
          "No puedes suspender al último admin activo de la institución.",
      };
    }
  }

  if (parsed.data.status === target.status) {
    return { ok: true };
  }

  await db
    .update(member)
    .set({ status: parsed.data.status })
    .where(eq(member.id, target.id));
  revalidatePath(`/account/organizations/${target.organizationId}`);
  return { ok: true };
}

export async function deleteTenantInvitationAction(
  invitationId: string,
): Promise<ActionResult> {
  const [row] = await db
    .select({
      organizationId: invitation.organizationId,
      status: invitation.status,
    })
    .from(invitation)
    .where(eq(invitation.id, invitationId))
    .limit(1);
  if (!row) return { ok: false, error: "La invitación no existe." };
  try {
    await requireTenantAdminFor(row.organizationId);
  } catch {
    return { ok: false, error: "No tienes permisos en esta institución." };
  }
  if (row.status !== "pending") {
    return {
      ok: false,
      error: "Solo puedes eliminar invitaciones pendientes.",
    };
  }

  await db.delete(invitation).where(eq(invitation.id, invitationId));
  revalidatePath(`/account/organizations/${row.organizationId}`);
  return { ok: true };
}
