## Why

Tres superficies del producto presentan fricciones visuales o de uso que conviene resolver en un solo ciclo coordinado:

1. La bandeja de tareas en desktop dedica una columna fija de ~256px a un panel lateral de filtros, desperdiciando espacio cuando la lista y el detalle se beneficiarían de más ancho.
2. Las páginas de autenticación carecen de marca visible (logo) y el botón de Google es solo texto, lo que reduce reconocimiento y confianza en pasos críticos del onboarding.
3. Los correos de invitación se envían como texto plano envuelto en `<pre>`, sin diseño, sin saludo personalizado al invitador, ni guía de primeros pasos. Esto golpea directamente al canal por el que entran nuevos administradores y miembros a la plataforma.

## What Changes

### Filtros de tareas (UI)
- Eliminar el `<aside>` lateral de filtros en `TasksRouteShell` y unificar la entrada en un único `Sheet` accionable desde un botón "Filtros".
- Mostrar el botón de filtros en todos los viewports (no solo mobile). Renombrar `MobileFiltersTrigger` a `FiltersTrigger` para reflejar el nuevo alcance.
- **BREAKING (UI)**: el panel lateral de filtros deja de estar visible permanentemente en desktop; ahora se abre on-demand.

### Páginas de autenticación (UI)
- Agregar el logo horizontal de Docentix por fuera y arriba de la `<Card>` en las 5 páginas de `(auth)/`: `login`, `forgot-password`, `reset-password`, `verify-email`, `check-email`.
- Soportar variante clara/oscura usando `logo-horizontal.png` y `logo-horizontal-dark.png` ya presentes en `public/images/`.
- Incluir el logo oficial de Google (SVG multicolor) en el botón "Continuar con Google" del formulario de login. Guardar asset en `public/images/google-logo.svg`.
- Extraer un componente compartido `AuthCardLayout` que encapsule el wrapper "logo + card" para evitar duplicación en las 5 páginas.

### Sistema de emails (infraestructura + contenido)
- Adoptar **React Email** (`@react-email/components` + `react-email` para preview local) como capa de templating, integrado con Resend ya en uso.
- Refactorizar `lib/auth/emails.ts` para enviar emails con `react` + `text` fallback en lugar de `<pre>{texto}</pre>`.
- Crear `EmailLayout` reutilizable: header con logo horizontal servido desde el dominio público, body slot, footer con disclaimer y link a Docentix.
- Rediseñar el correo **Super → Admin** como bienvenida a la plataforma con: nombre de la organización, resumen de capacidades (organización, miembros, tareas, checklists, comentarios, adjuntos), tres primeros pasos numerados (aceptar invitación → completar perfil → invitar a tu equipo) y CTA.
- Rediseñar el correo **Admin → Member** como invitación de confianza que mencione explícitamente el nombre completo del invitador y el nombre de la organización, con breve instrucción de uso y CTA.
- **BREAKING (API interna)**: `sendTenantInvitationEmail` agrega parámetro obligatorio `inviterName: string`. Todos los call sites en `app/account/organizations/[id]/actions.ts` deben propagarlo (disponible vía `requireSession`).

## Capabilities

### New Capabilities
- `email-templates`: sistema de plantillas de email basado en React Email, incluyendo `EmailLayout` compartido y contrato para nuevos templates (header con logo, body, footer, fallback `text`).

### Modified Capabilities
- `tasks-core`: cambia el contrato de UI de filtros en la bandeja de tareas; deja de exponerse como panel lateral permanente en desktop y pasa a un único `Sheet` triggerable en todos los viewports.
- `auth`: agrega requisito de identidad visual (logo Docentix) por fuera de la card de autenticación y logo de Google en el botón de OAuth.
- `account-invitations`: el correo Admin → Member debe incluir el nombre completo del invitador y el nombre de la organización; se establece el contrato de invocación con `inviterName`.
- `super-invitations`: el correo Super → Admin pasa de "invitación a administrar" a "bienvenida a la plataforma" con resumen de features y primeros pasos.
- `super-org-invitations`: alinear con el nuevo contenido del correo Super → Admin si el flujo de creación de organización usa el mismo template.

## Impact

### Código afectado
- `next-app/components/tasks/tasks-route-shell.tsx` — quitar aside, ajustar layout.
- `next-app/components/tasks/tasks-shell.tsx` — renombrar trigger y exponerlo en todos los viewports.
- `next-app/app/(auth)/**/page.tsx` (5 páginas) — usar `AuthCardLayout` con logo.
- `next-app/app/(auth)/login/login-form.tsx` — botón de Google con logo.
- `next-app/components/auth/auth-card-layout.tsx` (nuevo).
- `next-app/lib/email/templates/` (nuevo): `email-layout.tsx`, `org-admin-welcome-email.tsx`, `tenant-invitation-email.tsx`.
- `next-app/lib/auth/emails.ts` — refactor para usar React Email; cambio de firma de `sendTenantInvitationEmail`.
- `next-app/app/account/organizations/[id]/actions.ts` — pasar `inviterName` a `sendTenantInvitationEmail`.
- `next-app/app/super/(protected)/organizations/actions.ts` — sin cambio de firma pero adoptar nuevo template Super→Admin.

### Assets
- `next-app/public/images/google-logo.svg` (nuevo, descargar de fuente oficial multicolor).

### Dependencias (package.json)
- `@react-email/components` (runtime).
- `react-email` (dev, para preview local).

### Sin migraciones de DB ni cambios de schema.

### Riesgos
- React Email puede agregar peso al bundle si se importa accidentalmente en código cliente; los templates deben vivir en `lib/email/templates/` y solo importarse desde server actions / API routes.
- El logo en emails depende de que `BETTER_AUTH_URL` apunte al dominio público correcto en producción.
- Renombrar `MobileFiltersTrigger` rompe imports existentes; deben ajustarse en `tasks-route-shell.tsx`.

### Tamaño esperado
Change grande (probablemente >400 líneas modificadas). El `tasks.md` agrupará el trabajo en tres bloques claramente separables para permitir entrega encadenada si fuese necesario.
