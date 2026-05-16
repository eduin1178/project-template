import "server-only";

import { Button, Heading, Section, Text } from "@react-email/components";

import {
  EmailLayout,
  emailBaseUrl,
  emailStyles,
} from "./email-layout";

type TenantInvitationEmailProps = {
  inviterName: string;
  organizationName: string;
  role: string;
  invitationId: string;
  ttlDays: number;
  acceptUrl: string;
};

function getRoleLabel(role: string): string {
  return role === "admin" || role === "owner" ? "administrador" : "miembro";
}

function formatDaysLabel(ttlDays: number): string {
  return ttlDays === 1 ? "1 día" : `${ttlDays} días`;
}

export default function TenantInvitationEmail({
  inviterName,
  organizationName,
  role,
  ttlDays,
  acceptUrl,
}: TenantInvitationEmailProps) {
  const roleLabel = getRoleLabel(role);
  const ttlLabel = formatDaysLabel(ttlDays);

  return (
    <EmailLayout
      preview={`${inviterName} te invita a unirte a ${organizationName} en Docentix.`}
    >
      <Heading style={emailStyles.heading}>
        Te invitaron a {organizationName}
      </Heading>

      <Text style={emailStyles.paragraph}>Hola,</Text>

      <Text style={emailStyles.paragraph}>
        <strong>{inviterName}</strong> te ha invitado a unirte a{" "}
        <strong>{organizationName}</strong> en Docentix como{" "}
        <strong>{roleLabel}</strong>.
      </Text>

      <Text style={emailStyles.paragraph}>
        Docentix es la plataforma donde tu equipo organiza tareas, comparte
        documentos y coordina su trabajo día a día. Acepta la invitación para
        empezar a colaborar.
      </Text>

      <Section style={emailStyles.buttonWrapper}>
        <Button href={acceptUrl} style={emailStyles.button}>
          Aceptar invitación
        </Button>
      </Section>

      <Text style={emailStyles.ttl}>
        El enlace expira en {ttlLabel}.
      </Text>

      <Text style={emailStyles.disclaimer}>
        Si no conoces a {inviterName} o no esperabas esta invitación, ignora
        este mensaje.
      </Text>
    </EmailLayout>
  );
}

export function renderTenantInvitationEmailText(
  props: TenantInvitationEmailProps,
): string {
  const roleLabel = getRoleLabel(props.role);
  const ttlLabel = formatDaysLabel(props.ttlDays);

  return [
    `Te invitaron a ${props.organizationName}`,
    "",
    "Hola,",
    "",
    `${props.inviterName} te ha invitado a unirte a "${props.organizationName}" en Docentix como ${roleLabel}.`,
    "",
    "Docentix es la plataforma donde tu equipo organiza tareas, comparte documentos y coordina su trabajo día a día. Acepta la invitación para empezar a colaborar.",
    "",
    "Acepta la invitación abriendo este enlace:",
    props.acceptUrl,
    "",
    `El enlace expira en ${ttlLabel}.`,
    "",
    `Si no conoces a ${props.inviterName} o no esperabas esta invitación, ignora este mensaje.`,
    "",
    "— Docentix",
    emailBaseUrl,
  ].join("\n");
}

TenantInvitationEmail.PreviewProps = {
  inviterName: "María Pérez",
  organizationName: "Colegio San Martín",
  role: "member",
  invitationId: "preview-id",
  ttlDays: 7,
  acceptUrl: `${emailBaseUrl}/accept-invitation?invitationId=preview-id`,
} satisfies TenantInvitationEmailProps;
