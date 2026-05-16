import "server-only";

import type { ReactElement } from "react";
import { Resend } from "resend";

import OrgAdminWelcomeEmail, {
  renderOrgAdminWelcomeEmailText,
} from "@/lib/email/templates/org-admin-welcome-email";
import TenantInvitationEmail, {
  renderTenantInvitationEmailText,
} from "@/lib/email/templates/tenant-invitation-email";

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM ?? "Docentix <onboarding@resend.dev>";
const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

const resend = resendApiKey ? new Resend(resendApiKey) : null;

type SendArgs = {
  to: string;
  subject: string;
  text: string;
  react?: ReactElement;
};

export async function sendEmail({ to, subject, text, react }: SendArgs) {
  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY no definida. Email NO enviado.\n→ Destinatario: ${to}\n→ Asunto: ${subject}\n→ Texto:\n${text}`,
    );
    return { skipped: true as const };
  }

  const payload = react
    ? { from: emailFrom, to, subject, react, text }
    : { from: emailFrom, to, subject, text };

  const { error } = await resend.emails.send(payload);

  if (error) {
    console.error("[email] Resend error", error);
    throw new Error("No se pudo enviar el email.");
  }

  return { sent: true as const };
}

type OrgAdminInvitationArgs = {
  to: string;
  organizationName: string;
  invitationId: string;
  ttlDays: number;
};

export async function sendOrgAdminInvitationEmail({
  to,
  organizationName,
  invitationId,
  ttlDays,
}: OrgAdminInvitationArgs) {
  const acceptUrl = `${baseUrl}/accept-invitation?invitationId=${encodeURIComponent(invitationId)}`;
  const templateProps = { organizationName, invitationId, ttlDays, acceptUrl };

  return sendEmail({
    to,
    subject: `Bienvenido a Docentix — Administra ${organizationName}`,
    text: renderOrgAdminWelcomeEmailText(templateProps),
    react: OrgAdminWelcomeEmail(templateProps),
  });
}

type TenantInvitationArgs = {
  to: string;
  organizationName: string;
  role: string;
  invitationId: string;
  ttlDays: number;
  inviterName: string;
};

export async function sendTenantInvitationEmail({
  to,
  organizationName,
  role,
  invitationId,
  ttlDays,
  inviterName,
}: TenantInvitationArgs) {
  const acceptUrl = `${baseUrl}/accept-invitation?invitationId=${encodeURIComponent(invitationId)}`;
  const templateProps = {
    inviterName,
    organizationName,
    role,
    invitationId,
    ttlDays,
    acceptUrl,
  };

  return sendEmail({
    to,
    subject: `${inviterName} te invitó a ${organizationName} en Docentix`,
    text: renderTenantInvitationEmailText(templateProps),
    react: TenantInvitationEmail(templateProps),
  });
}
