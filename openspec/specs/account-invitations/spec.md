# account-invitations Specification

## Purpose

Bandeja personal de invitaciones para el usuario autenticado en `/account/invitations`. Lista las invitaciones nativas (`invitation`) cuyo email coincide con el de la sesión, en estado `pending` y no expiradas, y dirige al usuario al flujo público de aceptación existente sin validar coincidencia de email.

## Requirements

### Requirement: Ruta `/account/invitations` con bandeja del usuario

El sistema SHALL exponer `app/account/invitations/page.tsx` accesible para cualquier usuario autenticado. La página SHALL listar invitaciones cuyo `invitation.email` coincida (case-insensitive) con `session.user.email`, con `status = "pending"` y `expiresAt > now()`.

#### Scenario: Usuario con invitaciones pending
- **WHEN** un usuario autenticado con N invitaciones pending no expiradas a su email navega a `/account/invitations`
- **THEN** la página lista N filas con `organizationName`, `organization.logo`, `role` invitado (admin/member), `invitedAt`, `expiresAt`, y CTA "Ver invitación"

#### Scenario: Empty state
- **WHEN** un usuario sin invitaciones pending navega a la ruta
- **THEN** se renderiza `EmptyState` con título "No tienes invitaciones pendientes" y copy explicativo

#### Scenario: Email case-insensitive
- **WHEN** la `invitation.email` está en mayúsculas y `session.user.email` en minúsculas (o viceversa)
- **THEN** la comparación se hace en lowercase y la fila aparece igualmente

#### Scenario: Invitaciones expiradas no aparecen
- **WHEN** existe una invitación con `expiresAt < now()` para el email del usuario
- **THEN** no se muestra en la bandeja

#### Scenario: Invitaciones aceptadas o rechazadas no aparecen
- **WHEN** existe una invitación con `status` distinto a `pending` para el email del usuario
- **THEN** no se muestra en la bandeja

### Requirement: CTA "Ver invitación" enlaza a la ruta pública de aceptación

Cada fila SHALL incluir un enlace a `/accept-invitation?invitationId={id}`. El sistema NO SHALL aceptar la invitación directamente desde la bandeja: el usuario debe pasar por la ruta pública de aceptación (que ya existe) para confirmar la operación.

#### Scenario: Click en "Ver invitación"
- **WHEN** un usuario clickea el CTA de una fila
- **THEN** navega a `/accept-invitation?invitationId={id}`, que renderiza el flujo de aceptación existente con botón "Aceptar invitación" si ya está logueado

### Requirement: NO se valida coincidencia de email en aceptación

La existencia del listado filtrado por email SHALL NOT cambiar la regla establecida en `super-org-invitations`: la aceptación en `/accept-invitation` sigue siendo autoritativa por `invitationId` y NO compara el email del invitado contra el de la sesión.

#### Scenario: Usuario acepta invitación de otro email
- **WHEN** un usuario autenticado abre el link de aceptación de una invitación cuyo `email` no es el suyo
- **THEN** la aceptación procede igual; el `member` queda asociado al `userId` autenticado, no al email invitado

### Requirement: Email Admin → Member identifica al invitador

El sistema SHALL enviar a cada miembro invitado por un admin de organización un email cuyo contenido mencione explícitamente, en el cuerpo principal, el **nombre completo del invitador** (valor de `session.user.name` del admin que originó la invitación) Y el **nombre de la organización**. Esta mención SHALL ocurrir en una frase que vincule ambos datos para generar confianza (por ejemplo: "{inviterName} te ha invitado a unirte a {organizationName} en Docentix").

El sistema SHALL exigir el nombre del invitador como dato de invocación del helper `sendTenantInvitationEmail`. La firma del helper SHALL incluir el parámetro obligatorio `inviterName: string`. Los call sites de la capability `account-organizations` (server actions de invitación y reenvío) SHALL propagar este valor obtenido vía `requireSession`.

#### Scenario: Email a member contiene nombre del invitador y de la organización
- **WHEN** un admin con `user.name = "María Pérez"` invita a un miembro a la organización "Colegio X"
- **THEN** el email enviado al invitado contiene en el cuerpo principal una frase que menciona "María Pérez" Y "Colegio X" en relación directa con la invitación

#### Scenario: Firma del helper exige inviterName
- **WHEN** se inspecciona la signature de `sendTenantInvitationEmail` en `next-app/lib/auth/emails.ts`
- **THEN** el parámetro `inviterName: string` está presente y es obligatorio (no opcional)

#### Scenario: Call sites pasan inviterName desde session
- **WHEN** se inspeccionan los call sites de `sendTenantInvitationEmail` en `app/account/organizations/[id]/actions.ts`
- **THEN** todos pasan `inviterName` derivado de la session del admin que originó la action (con fallback defensivo a `session.user.email` si el nombre estuviese vacío)

### Requirement: Email Admin → Member entregado con plantilla React Email

El correo de invitación Admin → Member SHALL renderizarse mediante la plantilla `TenantInvitationEmail` definida en la capability `email-templates`. El envío SHALL incluir tanto `react` como `text` (fallback texto plano equivalente).

El email NO SHALL enviarse como bloque `<pre>` de texto plano.

#### Scenario: Email enviado con react + text
- **WHEN** se dispara el envío Admin → Member desde una server action
- **THEN** la invocación a `resend.emails.send` recibe `react: <TenantInvitationEmail/>` y un `text` no vacío

#### Scenario: No hay fallback a HTML envuelto en `<pre>`
- **WHEN** se inspecciona el helper `sendTenantInvitationEmail`
- **THEN** NO genera HTML con `<pre>` envolviendo texto escapado; el HTML proviene exclusivamente del renderizado de la plantilla React
