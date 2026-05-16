## ADDED Requirements

### Requirement: Email Super → Admin como bienvenida a Docentix

El sistema SHALL enviar al admin invitado por un super_admin un email cuyo contenido NO se limite a una invitación funcional, sino que SHALL constituir una bienvenida a la plataforma Docentix. El cuerpo del email SHALL incluir, en este orden:

1. Saludo de bienvenida a la plataforma.
2. Mención explícita del **nombre de la organización** que el admin va a administrar.
3. Resumen de las características más relevantes de Docentix, cubriendo: gestión de organización, invitación de miembros y asignación de roles, creación de tareas con checklists, comentarios y adjuntos en tareas, y seguimiento de avances.
4. Lista numerada de tres **primeros pasos**: (a) aceptar la invitación, (b) completar perfil, (c) invitar al equipo.
5. CTA prominente "Aceptar invitación" enlazando a `${BETTER_AUTH_URL}/accept-invitation?invitationId={invitationId}` (URL existente, no cambia).
6. Mención del TTL de la invitación.
7. Disclaimer "Si no esperabas esta invitación, ignora este mensaje".

#### Scenario: Email contiene bienvenida y nombre de organización
- **WHEN** un super_admin crea una organización "Colegio X" e invita a un admin
- **THEN** el email enviado al admin invitado contiene un saludo de bienvenida a Docentix y la mención explícita de "Colegio X" como organización a administrar

#### Scenario: Email lista características de la plataforma
- **WHEN** se renderiza el email
- **THEN** el cuerpo incluye una lista o enumeración que cubre las capacidades: gestión de organización, invitación de miembros, tareas con checklists, comentarios y adjuntos

#### Scenario: Email lista tres primeros pasos
- **WHEN** se renderiza el email
- **THEN** el cuerpo incluye una lista numerada con exactamente tres pasos: aceptar la invitación, completar perfil, invitar al equipo (en ese orden, con formas verbales en español neutral)

#### Scenario: Email contiene CTA y TTL
- **WHEN** se renderiza el email con `invitationId: "abc"` y `ttlDays: 7`
- **THEN** el email contiene un botón "Aceptar invitación" con `href = ${BETTER_AUTH_URL}/accept-invitation?invitationId=abc` y una mención al TTL de 7 días

### Requirement: Email Super → Admin entregado con plantilla React Email

El correo Super → Admin SHALL renderizarse mediante la plantilla `OrgAdminWelcomeEmail` definida en la capability `email-templates`. El envío SHALL incluir tanto `react` como `text` (fallback texto plano equivalente).

El email NO SHALL enviarse como bloque `<pre>` de texto plano.

#### Scenario: Email enviado con react + text
- **WHEN** se dispara el envío Super → Admin (desde creación de organización o reenvío)
- **THEN** la invocación a `resend.emails.send` recibe `react: <OrgAdminWelcomeEmail/>` y un `text` no vacío

#### Scenario: No hay fallback a HTML envuelto en `<pre>`
- **WHEN** se inspecciona el helper `sendOrgAdminInvitationEmail`
- **THEN** NO genera HTML con `<pre>` envolviendo texto escapado; el HTML proviene exclusivamente del renderizado de la plantilla React
