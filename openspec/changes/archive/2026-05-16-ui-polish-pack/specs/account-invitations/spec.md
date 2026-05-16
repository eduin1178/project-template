## ADDED Requirements

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
