import "server-only";

import { Button, Heading, Section, Text } from "@react-email/components";

import {
  EmailLayout,
  emailBaseUrl,
  emailStyles,
} from "./email-layout";

type OrgAdminWelcomeEmailProps = {
  organizationName: string;
  invitationId: string;
  ttlDays: number;
  acceptUrl: string;
};

const FEATURES: string[] = [
  "Gestiona tu institución y configúrala a la medida de tu equipo",
  "Invita miembros y asigna roles",
  "Crea tareas con checklists, fechas y prioridades",
  "Coordina a tu equipo con comentarios y adjuntos",
  "Mantén un historial claro de avances",
];

const FIRST_STEPS: string[] = [
  "Acepta la invitación con el botón de abajo",
  "Completa tu perfil",
  "Invita a tu equipo",
];

function formatDaysLabel(ttlDays: number) {
  return ttlDays === 1 ? "1 día" : `${ttlDays} días`;
}

export default function OrgAdminWelcomeEmail({
  organizationName,
  ttlDays,
  acceptUrl,
}: OrgAdminWelcomeEmailProps) {
  const ttlLabel = formatDaysLabel(ttlDays);

  return (
    <EmailLayout
      preview={`Bienvenido a Docentix. Acepta tu invitación para administrar ${organizationName}.`}
    >
      <Heading style={emailStyles.heading}>¡Bienvenido a Docentix!</Heading>

      <Text style={emailStyles.paragraph}>
        Has sido invitado a administrar la institución{" "}
        <strong>{organizationName}</strong>. Docentix es la plataforma donde
        coordinas tareas, equipos y documentación en un solo lugar.
      </Text>

      <Text style={{ ...emailStyles.paragraph, fontWeight: 600 }}>
        Con Docentix puedes:
      </Text>
      <ul style={emailStyles.list}>
        {FEATURES.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>

      <Text style={{ ...emailStyles.paragraph, fontWeight: 600 }}>
        Primeros pasos:
      </Text>
      <ol style={emailStyles.list}>
        {FIRST_STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <Section style={emailStyles.buttonWrapper}>
        <Button href={acceptUrl} style={emailStyles.button}>
          Aceptar invitación
        </Button>
      </Section>

      <Text style={emailStyles.ttl}>
        El enlace expira en {ttlLabel}.
      </Text>

      <Text style={emailStyles.disclaimer}>
        Si no esperabas esta invitación, ignora este mensaje.
      </Text>
    </EmailLayout>
  );
}

export function renderOrgAdminWelcomeEmailText(
  props: OrgAdminWelcomeEmailProps,
): string {
  const ttlLabel = formatDaysLabel(props.ttlDays);
  const featuresList = FEATURES.map((f) => `- ${f}`).join("\n");
  const stepsList = FIRST_STEPS.map((s, i) => `${i + 1}. ${s}`).join("\n");

  return [
    "¡Bienvenido a Docentix!",
    "",
    `Has sido invitado a administrar la institución "${props.organizationName}".`,
    "Docentix es la plataforma donde coordinas tareas, equipos y documentación en un solo lugar.",
    "",
    "Con Docentix puedes:",
    featuresList,
    "",
    "Primeros pasos:",
    stepsList,
    "",
    "Acepta la invitación abriendo este enlace:",
    props.acceptUrl,
    "",
    `El enlace expira en ${ttlLabel}.`,
    "",
    "Si no esperabas esta invitación, ignora este mensaje.",
    "",
    "— Docentix",
    emailBaseUrl,
  ].join("\n");
}

OrgAdminWelcomeEmail.PreviewProps = {
  organizationName: "Colegio San Martín",
  invitationId: "preview-id",
  ttlDays: 7,
  acceptUrl: `${emailBaseUrl}/accept-invitation?invitationId=preview-id`,
} satisfies OrgAdminWelcomeEmailProps;
