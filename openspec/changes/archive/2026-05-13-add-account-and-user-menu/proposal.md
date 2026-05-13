## Why

El menú del avatar hoy solo expone "Cerrar sesión" y no hay forma de que un usuario gestione su perfil, su contraseña, sus cuentas vinculadas, ni de ver las organizaciones a las que pertenece o las invitaciones que recibió. Esta change cierra la brecha entre el flujo de signup/login (ya implementado) y la operación cotidiana del producto para los tres roles: `super_admin`, `admin` (tenant) y `user`.

## What Changes

- Nuevo árbol de rutas compartidas `/account/*` accesible para cualquier usuario autenticado, sin sidebar de rol, con layout propio.
- `/account/profile`: edición de `name` e `image`, cambio de contraseña, set de contraseña para usuarios OAuth-only, y vinculación/desvinculación de Google con guardrail anti-lockout.
- `/account/organizations`: listado de organizaciones del usuario con badge "admin" donde corresponda. Oculto para `super_admin` (no aplica por [auth-roles](../../specs/auth-roles/spec.md#L33-L39)).
- `/account/organizations/[id]`: detalle de una organización. Si el usuario es admin: tabs "Miembros" e "Invitaciones", edición de `name` y `logo` (slug read-only), y emisión de invitaciones de `member` o `admin` reutilizando la tabla nativa `invitation`. Si es member: solo lectura.
- `/account/invitations`: bandeja de invitaciones pendientes filtradas por `invitation.email === session.user.email`. Aceptar redirige al flujo público existente `/accept-invitation`.
- Storage de logos en **Cloudflare R2** vía S3-compatible SDK (`@aws-sdk/client-s3`). Upload por server action; lectura por URL pública.
- **NavUser unificado** en [components/layout/nav-user.tsx](../../../next-app/components/layout/nav-user.tsx) que muestra items según el rol detectado de la sesión.
- Consolidación de `signOutAction` en [lib/auth/actions.ts](../../../next-app/lib/auth/actions.ts) eliminando el duplicado en [app/super/actions-session.ts](../../../next-app/app/super/actions-session.ts).
- Layout para `/app` con sidebar (no existía); reutiliza `AppSidebar` con `appSidebarConfig` y el nuevo `NavUser`.
- **BREAKING (interno):** se elimina `app/super/actions-session.ts`; cualquier import debe migrar a `@/lib/auth/actions`.

## Capabilities

### New Capabilities

- `account-profile`: gestión de perfil personal, contraseña y cuentas vinculadas.
- `account-organizations`: vista del usuario sobre sus organizaciones y operación admin (editar org, gestionar miembros e invitaciones de su tenant).
- `account-invitations`: bandeja de invitaciones recibidas por el usuario autenticado.
- `account-shell`: layout y navegación de `/account/*`, integración del `NavUser` por rol y unificación de sign-out.
- `r2-storage`: integración con Cloudflare R2 para upload de archivos públicos (logos de organización; extensible a futuros assets).

### Modified Capabilities

- `super-organizations`: las organizaciones ganan un campo `logo` editable; el detalle por super_admin lo refleja en read-only en el header.
- `super-org-invitations`: aclaración explícita de que el filtro de invitaciones por email es exclusivamente para el listado del invitado en `/account/invitations`, sin alterar la regla de aceptación (sigue siendo el `invitationId` la única autoridad).

## Impact

- **Código nuevo**: `app/account/**`, `lib/storage/r2.ts`, `app/app/layout.tsx` (nuevo), `lib/auth/account-queries.ts`, `lib/auth/role-menu.ts`.
- **Código modificado**: `components/layout/nav-user.tsx`, `components/layout/types.ts`, `lib/auth/actions.ts` (consolidar sign-out), `lib/db/schema/auth.ts` (campo `logo` en organization si no existe por el plugin).
- **Código eliminado**: `app/super/actions-session.ts`.
- **DB**: posible migración para `organization.logo` si el plugin de better-auth no lo provee por defecto. Verificar antes de migrar.
- **Dependencias nuevas**: `@aws-sdk/client-s3`.
- **Env vars nuevas**: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`.
- **APIs better-auth usadas**: `updateUser`, `changePassword`, `setPassword`, `linkSocial`, `unlinkAccount`, `listAccounts`, `organization.update`, `organization.createInvitation`, `organization.listInvitations`, `organization.listMembers`.
- **Riesgo principal**: la operación `unlinkAccount` puede dejar al usuario sin método de acceso si no hay guardrail server-side. Mitigado por validación en la action.
- **Forecast de tamaño**: change grande (>400 LOC). Sub-PRs sugeridos durante apply: (1) profile + shell, (2) invitations, (3) organizations + R2.
