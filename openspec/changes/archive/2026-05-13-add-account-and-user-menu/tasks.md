## 1. Preparación e infraestructura

- [x] 1.1 Instalar dependencia `@aws-sdk/client-s3` en `next-app/package.json`
- [x] 1.2 Agregar variables `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL` a `.env.example` (sin valores)
- [x] 1.3 Verificar si el plugin `organization` de better-auth instalado provee la columna `logo` en `organization`; si no, agregarla en `lib/db/schema/auth.ts` (text nullable) y generar migración con `drizzle-kit generate` — ya presente en schema (`organization.logo`)
- [x] 1.4 Aplicar la migración localmente (`drizzle-kit migrate` o equivalente del proyecto) y verificar columna en BD — no requerido, columna ya existe

## 2. Módulo de storage R2

- [x] 2.1 Crear `lib/storage/r2.ts` con `"server-only"`, exportando `uploadPublicAsset({ key, body, contentType })` y `deletePublicAsset({ key })`
- [x] 2.2 Implementar validación de env vars: helper interno `requireR2Config()` que lance error explícito si falta alguna
- [x] 2.3 Construir `S3Client` con `region: "auto"` y `endpoint` derivado de `R2_ACCOUNT_ID`
- [x] 2.4 Construir la URL pública en `uploadPublicAsset` como `${R2_PUBLIC_BASE_URL}/${key}` y retornarla
- [x] 2.5 Manualmente: probar un upload/delete contra el bucket real desde un script ad-hoc o desde la action de logo en step 7

## 3. Helpers de cuenta y roles

- [x] 3.1 Crear `lib/auth/account-queries.ts` con `listUserAccounts(userId)` que retorne las filas de `account` (provider, accountId, hasPassword)
- [x] 3.2 Crear `lib/auth/role-menu.ts` exportando `deriveMenuRole(session, memberships)` y `getUserMenuItems(role)` (items son `{ key, label, href, icon }`)
- [ ] 3.3 Agregar tests-de-humo opcionales para `deriveMenuRole` (o documentar verificación manual si el proyecto no tiene runner configurado)

## 4. Sign-out unificado

- [x] 4.1 Migrar imports de `app/super/(protected)/layout.tsx` de `../actions-session` a `@/lib/auth/actions`
- [x] 4.2 Eliminar `app/super/actions-session.ts`
- [x] 4.3 Verificar grep: ningún archivo referencia `actions-session`

## 5. NavUser unificado

- [x] 5.1 Extender `components/layout/types.ts` agregando `role: "super_admin" | "admin" | "user"` a las props relacionadas si es necesario — role vive en AppSidebar/NavUser props, no en SidebarUser
- [x] 5.2 Modificar `components/layout/nav-user.tsx` para aceptar prop `role` y renderizar items vía `getUserMenuItems(role)`
- [x] 5.3 Cada item del menú (excepto sign-out) es un `<Link>` a su ruta `/account/*` envuelto en `DropdownMenuItem asChild`
- [x] 5.4 Mantener "Cerrar sesión" como `<form action={signOutAction}>` al final del menú
- [x] 5.5 Iconos desde `@phosphor-icons/react` para cada item (`UserIcon`, `BuildingsIcon`, `EnvelopeIcon`, `SignOutIcon`)

## 6. Layouts que consumen NavUser

- [x] 6.1 Actualizar `app/admin/layout.tsx` para calcular `role` con `deriveMenuRole(session, memberships)` y pasarlo a `<AppSidebar>` → `<NavUser>`
- [x] 6.2 Actualizar `app/super/(protected)/layout.tsx` igual (role siempre será `"super_admin"`)
- [x] 6.3 Crear `app/app/layout.tsx` con `AppSidebar` configurado por `appSidebarConfig`, guardrail de redirect (super_admin → /super, admin → /admin), y `NavUser` con role derivado
- [x] 6.4 Asegurar que `AppSidebar` propaga `role` a `NavUser`

## 7. Layout `/account`

- [x] 7.1 Crear `app/account/layout.tsx` que: requiera sesión (redirige a `/login`), renderice header con título "Mi cuenta", enlace "← Volver al panel" calculado con `deriveDashboardHref(session)`, y `<main>` con `children`
- [x] 7.2 Aplicar `TooltipProvider` y `Toaster` (igual al patrón de los otros layouts)
- [x] 7.3 Usar tokens de tema (`bg-background`, `text-foreground`) sin colores mágicos

## 8. `/account/profile`

- [x] 8.1 Crear `app/account/profile/page.tsx` (server) que cargue sesión y `listUserAccounts(userId)`; determinar `hasPassword`, `hasGoogle`, y `canUnlinkX` para cada provider (anti-lockout)
- [x] 8.2 Crear `app/account/profile/_components/profile-form.tsx` (client) con `react-hook-form` + `zod` para `name` (required) e `image` (URL opcional)
- [x] 8.3 Crear `app/account/profile/_components/password-section.tsx` (client) con variantes "cambiar" (current + new + confirm) o "establecer" (new + confirm) según prop `mode: "change" | "set"`
- [x] 8.4 Crear `app/account/profile/_components/linked-accounts-section.tsx` (client) que liste providers actuales y exponga botones de vincular/desvincular Google
- [x] 8.5 Crear `app/account/profile/actions.ts` con `"use server"`:
  - `updateProfileAction(formData)` → `requireSession` + `auth.api.updateUser`
  - `changePasswordAction(formData)` → `auth.api.changePassword({ revokeOtherSessions: true })`
  - `setPasswordAction(formData)` → verificar que NO existe credential previa, luego `auth.api.setPassword`
  - `unlinkAccountAction({ providerId })` → verificar al menos un método de acceso restante, luego `auth.api.unlinkAccount`
- [x] 8.6 `linkSocial({ provider: "google", callbackURL: "/account/profile" })` se invoca desde `linked-accounts-section.tsx` directamente con `authClient`
- [x] 8.7 Manejar errores con `<Alert>` y feedback con `toast` (sonner)

## 9. `/account/invitations`

- [x] 9.1 Crear `app/account/invitations/page.tsx` (server): query Drizzle a `invitation JOIN organization` con filtro `LOWER(email) = LOWER(session.user.email) AND status = 'pending' AND expiresAt > now()`
- [x] 9.2 Renderizar tabla/lista con `logo`, `organizationName`, `role`, `invitedAt`, `expiresAt` y CTA "Ver invitación" → `/accept-invitation?invitationId={id}`
- [x] 9.3 Empty state con `EmptyState` cuando no haya filas
- [x] 9.4 Sin server actions propias (la aceptación pasa por la ruta pública existente)

## 10. `/account/organizations`

- [x] 10.1 Crear `app/account/organizations/page.tsx` (server): si `session.user.role === "super_admin"`, renderizar mensaje "Esta sección no aplica" + CTA a `/super`; en otro caso, query a `member JOIN organization WHERE userId = session.user.id`
- [x] 10.2 Renderizar lista con `logo`, `name`, `slug`, `joinedAt` y badge "admin" cuando `member.role ∈ {"admin", "owner"}`
- [x] 10.3 Empty state cuando no haya membresías

## 11. `/account/organizations/[id]`

- [x] 11.1 Crear `app/account/organizations/[id]/page.tsx` (server): cargar membership del usuario para la org; si no existe → `notFound()`. Derivar `mode: "admin" | "member"` desde `member.role`
- [x] 11.2 Renderizar `OrgDetailHeader` (compartido) con `logo`, `name`, `slug`, `createdAt`, y — si `mode === "admin"` — botón "Editar" que abre dialog
- [x] 11.3 Renderizar tabs `Miembros` e `Invitaciones` con datos cargados server-side (queries Drizzle a `member` e `invitation` por `organizationId`)
- [x] 11.4 Tab Invitaciones: mostrar acciones (copiar link / reenviar / eliminar) solo si `mode === "admin"`
- [x] 11.5 Tab Invitaciones: incluir botón "Invitar" (solo admin) que abre dialog con form (`email`, `role: "admin" | "member"`)

## 12. Server actions de la organización (admin de tenant)

- [x] 12.1 Crear `app/account/organizations/[id]/actions.ts` con `"use server"`:
  - `requireTenantAdminFor(organizationId)` helper que verifica `member.role admin|owner` para esa org
  - `updateOrganizationAction({ organizationId, name })` → verifica admin, `auth.api.organization.update` (o Drizzle update directo)
  - `uploadOrganizationLogoAction(formData)` → verifica admin, valida MIME (`image/png|jpeg|webp|svg+xml`) y tamaño (≤ 1 MB), lee logo previo, sube nuevo via `uploadPublicAsset`, persiste `logo` URL, best-effort `deletePublicAsset` del anterior
  - `createTenantInvitationAction({ organizationId, email, role })` → verifica admin, valida no exista pending duplicada, crea fila `invitation`, envía email via `sendEmail`
  - `resendTenantInvitationAction({ invitationId })` → verifica admin sobre la org de la invitación, valida status pending y no expirada, re-envía email
  - `deleteTenantInvitationAction({ invitationId })` → verifica admin, elimina fila solo si `status === "pending"`
- [x] 12.2 Helper `buildLogoKey(organizationId, fileExtension)` que retorne `org-logos/${organizationId}/${randomUUID()}.${ext}`
- [x] 12.3 Mensajes de error en español neutral

## 13. Reuso de componentes super ↔ admin

- [x] 13.1 Extraer `OrgMembersTable` y `OrgInvitationsTable` de `app/super/(protected)/organizations/[id]/` a `components/organizations/` aceptando prop `canManage` + callbacks
- [x] 13.2 Las acciones se pasan como props (server actions) para que cada panel inyecte las suyas (super usa sus actions; admin usa las nuevas de tenant)
- [x] 13.3 Actualizar `app/super/(protected)/organizations/[id]/page.tsx` para consumir los componentes extraídos
- [x] 13.4 Actualizar el header del detalle super para mostrar `logo` (si existe) como read-only

## 14. Email de invitación de tenant

- [x] 14.1 Agregar a `lib/auth/emails.ts` (o módulo equivalente) una función `sendTenantInvitationEmail({ to, organizationName, role, invitationId, expiresAt })`
- [x] 14.2 Copy en español neutral, segunda persona `tú`, link a `${baseUrl}/accept-invitation?invitationId=${id}`, aviso de expiración a 7 días, mención del rol invitado

## 15. Validación, lint y verificación manual

- [x] 15.1 `openspec validate add-account-and-user-menu` sin errores
- [x] 15.2 `npm run lint` (o equivalente) sin errores — solo queda warning preexistente en `request-demo-form.tsx`
- [x] 15.3 `npx tsc --noEmit` sin errores
- [x] 15.4 Smoke test manual cada rol: super_admin → menú correcto, admin tenant → menú correcto, user regular → menú correcto
- [x] 15.5 Smoke test perfil: cambiar nombre, cambiar password, vincular Google, intentar desvincular el único método (debe fallar), establecer password (cuenta Google-only)
- [x] 15.6 Smoke test invitaciones: usuario A invita a usuario B (registrado), B ve la invitación en `/account/invitations`, acepta, queda como member
- [x] 15.7 Smoke test organización: admin edita name, sube logo (PNG ≤ 1 MB), logo aparece en lista y detalle; admin de otra org no puede editar

## 16. Documentación

- [x] 16.1 Actualizar `next-app/README.md` con sección "Configuración de Cloudflare R2" (variables + bucket público)
- [x] 16.2 Asegurar que `AGENTS.md` no necesita updates (las reglas siguen vigentes)
