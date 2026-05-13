"use server";

import { randomUUID } from "node:crypto";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/lib/auth/server";
import { sendOrgAdminInvitationEmail } from "@/lib/auth/emails";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { invitation, member, organization, user } from "@/lib/db/schema";

const INVITATION_TTL_DAYS = 7;

const slugRegex = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const createOrgSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio."),
  slug: z
    .string()
    .trim()
    .min(2, "El slug debe tener al menos 2 caracteres.")
    .max(60, "El slug es demasiado largo.")
    .regex(
      slugRegex,
      "Solo minúsculas, números y guiones. No puede empezar ni terminar con guion.",
    ),
  adminName: z.string().trim().min(1, "El nombre del admin es obligatorio."),
  adminEmail: z.string().trim().email("Ingresa un email válido."),
});

export type CreateOrgFieldError = "slug" | "adminEmail" | "name" | "adminName";

export type CreateOrgResult =
  | { ok: true; organizationId: string; invitationId: string; emailSent: boolean }
  | { ok: false; error: string; field?: CreateOrgFieldError };

export async function createOrganizationWithAdminAction(
  input: z.input<typeof createOrgSchema>,
): Promise<CreateOrgResult> {
  const session = await requireSuperAdmin();

  const parsed = createOrgSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "Datos inválidos.",
      field: issue?.path[0] as CreateOrgFieldError | undefined,
    };
  }

  const { name, slug, adminName, adminEmail } = parsed.data;

  const [existing] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1);
  if (existing) {
    return { ok: false, error: "Ese slug ya está en uso.", field: "slug" };
  }

  let createdOrgId: string | null = null;

  try {
    const created = await auth.api.createOrganization({
      body: { name, slug, userId: session.user.id },
      headers: await headers(),
    });
    createdOrgId = (created as { id?: string } | null)?.id ?? null;
  } catch (error) {
    console.error("[orgs] createOrganization falló", error);
    return { ok: false, error: "No pudimos crear la organización." };
  }

  if (!createdOrgId) {
    return { ok: false, error: "No pudimos crear la organización." };
  }

  await db
    .delete(member)
    .where(
      and(
        eq(member.organizationId, createdOrgId),
        eq(member.userId, session.user.id),
      ),
    );

  const invitationId = randomUUID();
  const expiresAt = new Date(
    Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  await db.insert(invitation).values({
    id: invitationId,
    organizationId: createdOrgId,
    email: adminEmail,
    role: "admin",
    status: "pending",
    expiresAt,
    inviterId: session.user.id,
  });

  let emailSent = false;
  try {
    await sendOrgAdminInvitationEmail({
      to: adminEmail,
      organizationName: name,
      invitationId,
      ttlDays: INVITATION_TTL_DAYS,
    });
    emailSent = true;
  } catch (error) {
    console.error("[orgs] envío de email de invitación falló", error);
  }

  void adminName;
  revalidatePath("/super/organizations");
  return { ok: true, organizationId: createdOrgId, invitationId, emailSent };
}

export type SimpleResult = { ok: true } | { ok: false; error: string };

export async function resendOrgInvitationAction(
  invitationId: string,
): Promise<SimpleResult> {
  await requireSuperAdmin();

  const [row] = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      organizationId: invitation.organizationId,
    })
    .from(invitation)
    .where(eq(invitation.id, invitationId))
    .limit(1);

  if (!row) {
    return { ok: false, error: "La invitación no existe." };
  }
  if (row.status !== "pending") {
    return { ok: false, error: "Esta invitación ya no está pendiente." };
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    return { ok: false, error: "La invitación ya expiró. Elimínala y crea una nueva." };
  }

  const [org] = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, row.organizationId))
    .limit(1);

  await sendOrgAdminInvitationEmail({
    to: row.email,
    organizationName: org?.name ?? "tu organización",
    invitationId: row.id,
    ttlDays: Math.max(
      1,
      Math.ceil((row.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
    ),
  });

  return { ok: true };
}

export async function deleteOrgInvitationAction(
  invitationId: string,
): Promise<SimpleResult> {
  await requireSuperAdmin();

  const result = await db
    .delete(invitation)
    .where(
      and(eq(invitation.id, invitationId), eq(invitation.status, "pending")),
    )
    .returning({ id: invitation.id });

  if (result.length === 0) {
    return {
      ok: false,
      error: "Solo puedes eliminar invitaciones pendientes.",
    };
  }

  return { ok: true };
}

export type OrganizationListItem = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  hasAdmin: boolean;
};

export async function listOrganizations(): Promise<OrganizationListItem[]> {
  await requireSuperAdmin();

  const orgs = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt,
    })
    .from(organization)
    .orderBy(organization.createdAt);

  if (orgs.length === 0) return [];

  const admins = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.role, "admin"));

  const adminOrgIds = new Set(admins.map((row) => row.organizationId));

  return orgs.map((org) => ({
    ...org,
    hasAdmin: adminOrgIds.has(org.id),
  }));
}

export type OrganizationMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: Date;
};

export type OrganizationInvitation = {
  id: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  isExpired: boolean;
};

export type OrganizationDetail = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  members: OrganizationMember[];
  invitations: OrganizationInvitation[];
};

export async function getOrganizationDetail(
  organizationId: string,
): Promise<OrganizationDetail | null> {
  await requireSuperAdmin();

  const [org] = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt,
    })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);
  if (!org) return null;

  const members = await db
    .select({
      id: member.id,
      userId: member.userId,
      name: user.name,
      email: user.email,
      role: member.role,
      joinedAt: member.createdAt,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, organizationId));

  const rows = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    })
    .from(invitation)
    .where(eq(invitation.organizationId, organizationId));

  const now = Date.now();
  const invitations: OrganizationInvitation[] = rows.map((row) => ({
    ...row,
    isExpired: row.expiresAt.getTime() <= now,
  }));

  return { ...org, members, invitations };
}

void gt;
