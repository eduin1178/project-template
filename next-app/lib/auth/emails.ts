import "server-only";

import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM ?? "Edunet <onboarding@resend.dev>";

const resend = resendApiKey ? new Resend(resendApiKey) : null;

type SendArgs = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail({ to, subject, text, html }: SendArgs) {
  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY no definida. Email NO enviado.\n→ Destinatario: ${to}\n→ Asunto: ${subject}\n→ Texto:\n${text}`,
    );
    return { skipped: true as const };
  }

  const { error } = await resend.emails.send({
    from: emailFrom,
    to,
    subject,
    text,
    html: html ?? `<pre>${escapeHtml(text)}</pre>`,
  });

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
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const url = `${baseUrl}/accept-invitation?invitationId=${encodeURIComponent(invitationId)}`;

  return sendEmail({
    to,
    subject: `Invitación para administrar ${organizationName} en Edunet`,
    text: `Hola,\n\nTe invitamos a administrar la organización "${organizationName}" en Edunet.\n\nAbre este enlace para aceptar la invitación y crear tu cuenta:\n${url}\n\nEl enlace expira en ${ttlDays} ${ttlDays === 1 ? "día" : "días"}.\n\nSi no esperabas esta invitación, ignora este mensaje.`,
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
