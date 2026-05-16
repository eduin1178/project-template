# email-templates Specification

## Purpose

Sistema de plantillas de email transaccional para Docentix basado en React Email + Resend. Define un stack server-only para construir, renderizar y previsualizar correos con un layout compartido (`EmailLayout`), plantillas tipadas por caso de uso (bienvenida de admin Super → Admin, invitación Admin → Member), versiones texto plano equivalentes para fallback y copy estandarizado en español neutral. Las capabilities de invitaciones (`super-invitations`, `account-invitations`) consumen estas plantillas en lugar de generar HTML envuelto en `<pre>`.

## Requirements

### Requirement: Stack de plantillas de email basado en React Email

El sistema SHALL usar `@react-email/components` para construir plantillas de email transaccional. Las plantillas SHALL vivir en `next-app/lib/email/templates/` como componentes React server-only. El envío SHALL seguir realizándose mediante Resend invocando `resend.emails.send({ from, to, subject, react, text })`.

Cada plantilla SHALL exportar:
- Un componente React por defecto que recibe props tipadas.
- Una función auxiliar `render<Template>Text(props): string` que produce la versión texto plano equivalente para usarse como `text` fallback.

#### Scenario: Plantillas viven en lib/email/templates
- **WHEN** se inspecciona `next-app/lib/email/templates/`
- **THEN** existe al menos `email-layout.tsx`, `org-admin-welcome-email.tsx` y `tenant-invitation-email.tsx`

#### Scenario: Envío usa react + text
- **WHEN** `sendEmail` o un helper específico envía un correo basado en plantilla
- **THEN** la llamada a `resend.emails.send` incluye `react: <Template/>` y `text` con la versión equivalente generada por la función `render*Text`

#### Scenario: Sin RESEND_API_KEY el envío se loguea
- **WHEN** `RESEND_API_KEY` no está definida en el entorno
- **THEN** el helper de envío loguea destinatario, asunto y `text` por consola y retorna `{ skipped: true }` sin invocar Resend

### Requirement: Layout compartido `EmailLayout`

El sistema SHALL exponer `EmailLayout` en `lib/email/templates/email-layout.tsx` como wrapper común para todas las plantillas. El layout SHALL renderizar:

- Estructura `<Html><Head><Preview/><Body><Container>...</Container></Body></Html>` (o equivalente con primitivas de React Email).
- Un header con `<Img src="{BETTER_AUTH_URL}/images/logo-horizontal.png" alt="Docentix" />` con ancho fijo (aproximadamente 160px).
- Un slot para el cuerpo del mensaje.
- Un footer con copy mínimo ("Este es un mensaje automático de Docentix") y un link a la URL pública del producto.
- Estilos minimalistas inline (React Email convierte estilos a atributos email-safe). Paleta consistente con la app.

#### Scenario: Layout usado por todas las plantillas
- **WHEN** se inspeccionan `org-admin-welcome-email.tsx` y `tenant-invitation-email.tsx`
- **THEN** ambas plantillas envuelven su contenido con `<EmailLayout>` (o equivalente)

#### Scenario: Logo apunta a URL pública del dominio
- **WHEN** se inspecciona el src de la imagen del header
- **THEN** la URL es `${BETTER_AUTH_URL}/images/logo-horizontal.png` (no base64, no CID)

#### Scenario: Footer presente y con copy en español neutral
- **WHEN** se renderiza el email
- **THEN** existe un footer con texto en español neutral (`tú`, sin voseo), sin información sensible y con un link al producto

### Requirement: Plantilla `OrgAdminWelcomeEmail` (Super → Admin)

El sistema SHALL exponer `OrgAdminWelcomeEmail` con la siguiente estructura mínima:

1. Saludo de bienvenida a la plataforma Docentix.
2. Mención explícita del nombre de la organización (`organizationName`).
3. Resumen de capacidades de la plataforma cubriendo: gestión de organización, invitación de miembros, creación de tareas con checklists, comentarios y adjuntos.
4. Lista numerada de tres primeros pasos: (a) aceptar la invitación, (b) completar perfil, (c) invitar al equipo.
5. CTA prominente "Aceptar invitación" enlazando a `${BETTER_AUTH_URL}/accept-invitation?invitationId={invitationId}`.
6. Mención del TTL en días.
7. Disclaimer "Si no esperabas esta invitación, ignora este mensaje".

Props requeridas: `organizationName: string`, `invitationId: string`, `ttlDays: number`, `acceptUrl: string`.

#### Scenario: Email Super→Admin contiene bienvenida y nombre de organización
- **WHEN** se renderiza la plantilla con `organizationName: "Colegio X"`
- **THEN** el HTML contiene saludo de bienvenida y el string "Colegio X" en el cuerpo principal

#### Scenario: Email Super→Admin lista los tres primeros pasos
- **WHEN** se renderiza la plantilla
- **THEN** el cuerpo incluye una lista numerada con exactamente los items "Acepta la invitación", "Completa tu perfil", "Invita a tu equipo" (o variantes neutrales equivalentes en español)

#### Scenario: CTA enlaza al URL correcto
- **WHEN** se renderiza la plantilla con `invitationId: "abc"` y `BETTER_AUTH_URL` configurado
- **THEN** el botón "Aceptar invitación" tiene `href = ${BETTER_AUTH_URL}/accept-invitation?invitationId=abc`

#### Scenario: Versión texto plano cubre el mismo contenido
- **WHEN** se invoca `renderOrgAdminWelcomeEmailText(props)`
- **THEN** retorna un string que menciona la organización, los tres primeros pasos, el URL de aceptación y el TTL

### Requirement: Plantilla `TenantInvitationEmail` (Admin → Member)

El sistema SHALL exponer `TenantInvitationEmail` con la siguiente estructura mínima:

1. Saludo neutral ("Hola,").
2. Frase explícita mencionando el nombre completo del invitador (`inviterName`) Y el nombre de la organización (`organizationName`), con el propósito de generar confianza.
3. Breve instrucción (1-2 párrafos) sobre Docentix y la invitación a colaborar.
4. CTA prominente "Aceptar invitación" enlazando a `${BETTER_AUTH_URL}/accept-invitation?invitationId={invitationId}`.
5. Mención del TTL en días.
6. Disclaimer mencionando al invitador: "Si no conoces a {inviterName} o no esperabas esta invitación, ignora este mensaje".

Props requeridas: `inviterName: string`, `organizationName: string`, `role: string`, `invitationId: string`, `ttlDays: number`, `acceptUrl: string`.

#### Scenario: Email Admin→Member menciona invitador y organización en el cuerpo principal
- **WHEN** se renderiza la plantilla con `inviterName: "María Pérez"` y `organizationName: "Colegio X"`
- **THEN** el HTML contiene tanto "María Pérez" como "Colegio X" en una misma frase o en oraciones contiguas del cuerpo principal

#### Scenario: CTA enlaza al URL correcto
- **WHEN** se renderiza la plantilla con `invitationId: "xyz"`
- **THEN** el botón "Aceptar invitación" tiene `href = ${BETTER_AUTH_URL}/accept-invitation?invitationId=xyz`

#### Scenario: Disclaimer menciona al invitador
- **WHEN** se renderiza la plantilla con `inviterName: "María Pérez"`
- **THEN** el footer/disclaimer contiene una frase que referencia a "María Pérez"

#### Scenario: Versión texto plano cubre el mismo contenido
- **WHEN** se invoca `renderTenantInvitationEmailText(props)`
- **THEN** retorna un string que menciona al invitador, la organización, el URL de aceptación y el TTL

### Requirement: Copy en español neutral

Todas las plantillas SHALL usar español neutral con segunda persona singular (`tú`) y conjugaciones estándar (Acepta, Completa, Invita, Ignora). NO SHALL usar voseo (Aceptá, Completá, Invitá, Hacé, dale) ni regionalismos.

#### Scenario: Inspección de copy de las plantillas
- **WHEN** se inspeccionan los strings de `OrgAdminWelcomeEmail` y `TenantInvitationEmail`
- **THEN** todos los verbos imperativos usan formas neutrales (`Acepta`, `Completa`, `Invita`, `Ignora`) y NO contienen voseo

### Requirement: Preview local de plantillas

El proyecto SHALL incluir `react-email` como dependencia de desarrollo para permitir preview local de las plantillas mediante `npx react-email dev` (o equivalente). Los archivos de plantilla SHALL ser compatibles con esa herramienta sin configuración adicional.

#### Scenario: Dependencias declaradas
- **WHEN** se inspecciona `next-app/package.json`
- **THEN** `@react-email/components` está en `dependencies` y `react-email` en `devDependencies`
