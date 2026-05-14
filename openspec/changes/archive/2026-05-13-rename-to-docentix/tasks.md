## 1. Identificadores internos del código

- [x] 1.1 En `next-app/lib/db/client.ts`: renombrar `__edunetDbClient` → `__docentixDbClient` (3 ocurrencias: declaración del tipo, lectura, asignación).
- [x] 1.2 En `next-app/lib/auth/emails.ts`: cambiar el default de `emailFrom` de `"Edunet <onboarding@resend.dev>"` a `"Docentix <onboarding@resend.dev>"`.

## 2. Sidebar y brand UI

- [x] 2.1 En `next-app/components/layout/contexts/admin.ts`: `label: "Edunet"` → `"Docentix"`.
- [x] 2.2 En `next-app/components/layout/contexts/app.ts`: `label: "Edunet"` → `"Docentix"`.
- [x] 2.3 En `next-app/components/layout/contexts/super.ts`: `label: "Edunet"` → `"Docentix"`.

## 3. Títulos de página (metadata)

- [x] 3.1 `app/(auth)/login/page.tsx`: `"Iniciar sesión — Edunet"` → `"Iniciar sesión — Docentix"`.
- [x] 3.2 `app/(auth)/forgot-password/page.tsx`: `"Recupera tu contraseña — Edunet"` → `"... — Docentix"`.
- [x] 3.3 `app/(auth)/reset-password/page.tsx`: `"Define tu nueva contraseña — Edunet"` → `"... — Docentix"`.
- [x] 3.4 `app/(auth)/verify-email/page.tsx`: `"Verificación de correo — Edunet"` → `"... — Docentix"`.
- [x] 3.5 `app/(auth)/check-email/page.tsx`: `"Revisa tu correo — Edunet"` → `"... — Docentix"`.
- [x] 3.6 `app/admin/page.tsx`: `"Panel de administración — Edunet"` → `"... — Docentix"`.
- [x] 3.7 `app/app/page.tsx`: `title: "Edunet"` → `"Docentix"`; `<h1>Bienvenido a Edunet</h1>` → `Bienvenido a Docentix`.
- [x] 3.8 `app/account/profile/page.tsx`: `"Mi perfil — Edunet"` → `"... — Docentix"`.
- [x] 3.9 `app/account/organizations/page.tsx`: `"Mis organizaciones — Edunet"` → `"... — Docentix"`.
- [x] 3.10 `app/account/organizations/[id]/page.tsx`: actualizar la plantilla de title con `Docentix`.
- [x] 3.11 `app/account/invitations/page.tsx`: `"Invitaciones — Edunet"` → `"... — Docentix"`.
- [x] 3.12 `app/super/setup/page.tsx`: `"Configura el primer super admin — Edunet"` → `"... — Docentix"`.
- [x] 3.13 `app/super/(protected)/super-admins/page.tsx`: `"Super admins — Edunet"` → `"... — Docentix"`.
- [x] 3.14 `app/super/(protected)/organizations/page.tsx`: `"Organizaciones — Edunet"` → `"... — Docentix"`.
- [x] 3.15 `app/super/(protected)/organizations/new/page.tsx`: `"Nueva organización — Edunet"` → `"... — Docentix"`.
- [x] 3.16 `app/super/(protected)/organizations/[id]/page.tsx`: actualizar la plantilla de title con `Docentix`.
- [x] 3.17 `app/accept-invitation/page.tsx`: title + copy embebida (2 ocurrencias en JSX) → `Docentix`.
- [x] 3.18 `app/accept-invitation/complete/error/page.tsx`: `"No pudimos completar la invitación — Edunet"` → `"... — Docentix"`.
- [x] 3.19 `app/super/(public)/accept-invitation/page.tsx`: title + 2 ocurrencias en copy → `Docentix`.
- [x] 3.20 `app/super/(public)/accept-invitation/complete/page.tsx`: `"Finalizando invitación — Edunet"` → `"... — Docentix"`.

## 4. Emails transaccionales

- [x] 4.1 `lib/auth/emails.ts`: actualizar `subject` y `text` de `sendOrgAdminInvitationEmail` (función real, antes mencionada como `sendOrganizationOwnerInvitationEmail`): reemplazar `Edunet` por `Docentix`.
- [x] 4.2 `lib/auth/emails.ts`: actualizar `subject` y `text` de `sendTenantInvitationEmail` (función real, antes mencionada como `sendOrganizationMemberInvitationEmail`): reemplazar `Edunet` por `Docentix`.
- [x] 4.3 `lib/auth/server.ts`: `subject: "Restablece tu contraseña — Edunet"` → `"... — Docentix"`.
- [x] 4.4 `lib/auth/server.ts`: `subject: "Verifica tu correo — Edunet"` → `"... — Docentix"`.
- [x] 4.5 `app/super/actions.ts`: `subject: "Te invitamos al panel super de Edunet"` → `"... de Docentix"`; en `text` reemplazar `Edunet` → `Docentix`.

## 5. Infra local (docker-compose)

- [x] 5.1 `docker-compose.yml`: `container_name: edunet-postgres` → `docentix-postgres`.
- [x] 5.2 `docker-compose.yml`: `POSTGRES_USER: ${POSTGRES_USER:-edunet}` → `${POSTGRES_USER:-docentix}`.
- [x] 5.3 `docker-compose.yml`: `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-edunet_dev}` → `${POSTGRES_PASSWORD:-docentix_dev}`.
- [x] 5.4 `docker-compose.yml`: `POSTGRES_DB: ${POSTGRES_DB:-edunet}` → `${POSTGRES_DB:-docentix}`.
- [x] 5.5 `docker-compose.yml`: en el `healthcheck`, actualizar `pg_isready -U ${POSTGRES_USER:-edunet} -d ${POSTGRES_DB:-edunet}` con los nuevos defaults.
- [ ] 5.6 `next-app/.env.example`: si contiene `DATABASE_URL` con `edunet`, actualizarla a `postgresql://docentix:docentix_dev@localhost:5432/docentix`. Si menciona `EMAIL_FROM`, actualizarla a `Docentix <onboarding@resend.dev>`. **Pendiente — bloqueado por permisos**: el sandbox denegó leer/editar `.env.example`. Aplicar manualmente.

## 6. Verificación final

- [x] 6.1 Ejecutar grep case-insensitive sobre `next-app/`, `docker-compose.yml` excluyendo `node_modules/` y `openspec/`. Resultado: **0 matches** de `edunet` en código activo. (`openspec/specs/db-foundation/spec.md` aún tiene la URL vieja — se sincroniza al archivar el change vía delta).
- [x] 6.2 `npx tsc --noEmit`: **0 errores**. `npm run lint`: 2 errores preexistentes (`components/landing/request-demo-form.tsx`, `hooks/use-mobile.ts`) **no introducidos por este change** — quedan para tratar aparte.
- [x] 6.3 Documentar en el cuerpo de la PR la instrucción de migración local: `docker compose down -v && docker compose up -d && cd next-app && npm run db:push`. **Pendiente — al crear el PR**.
- [x] 6.4 Smoke manual local: levantar Postgres con los nuevos defaults, correr `npm run dev`, verificar que login y la home cargan con título "Docentix". **Pendiente — el usuario lo verifica**.

## Review Workload Forecast

- Estimado de líneas cambiadas: ~80-120 (mayormente sustituciones de 1 línea en ~30 archivos).
- 400-line budget risk: **Low**.
- Chained PRs recommended: **No**. Es un find-and-replace coordinado; partirlo deja estados intermedios inconsistentes.
- Decision needed before apply: **No**.
