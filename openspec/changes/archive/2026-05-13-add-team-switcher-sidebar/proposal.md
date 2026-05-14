## Why

Hoy un usuario que pertenece a múltiples organizaciones no tiene cómo cambiar de tenant desde el shell autenticado: el sidebar muestra el brand "Docentix" estático y no hay UI para listar las orgs ni para conmutar entre ellas. La sesión ya persiste `activeOrganizationId` (campo nativo del plugin organization de better-auth), pero nada lo lee ni lo expone. Además, si el usuario hace login en otro dispositivo/sesión, no recordamos cuál era la última org en la que estaba — empieza siempre desde cero.

## What Changes

- Reemplazar `NavBrand` por un `TeamSwitcher` (dropdown shadcn) en el `SidebarHeader` de los shells `admin` y `app`. El shell `super` mantiene `NavBrand` (los super admins no pertenecen a tenants ni cambian de org).
- El `TeamSwitcher` SHALL mostrar en el trigger: avatar/iniciales de la org activa + nombre + caret. Al abrir, lista todas las orgs **activas** del usuario (status='active') y marca la actual con un check.
- Al seleccionar otra org SHALL llamar a una server action `switchActiveOrganizationAction(orgId)` que:
  - Verifica que el usuario tenga membership activa en esa org (defensive).
  - Llama `auth.api.setActiveOrganization({ body: { organizationId } })` para actualizar `session.activeOrganizationId`.
  - Persiste también `user.lastActiveOrganizationId` (campo nuevo) para restaurar entre sesiones/dispositivos.
  - Hace `revalidatePath("/")` y luego router-refresh client-side.
- Agregar columna `lastActiveOrganizationId` a `user` vía `user.additionalFields` en la config de `betterAuth` (regenerable, no editable a mano).
- Al loguearse: en `redirectToDashboard` (o en cada layout protected), si `session.activeOrganizationId` es null o apunta a una org donde el usuario ya no es activo:
  - Si `user.lastActiveOrganizationId` está seteado y sigue siendo membership activa → restaurarlo vía `setActiveOrganization`.
  - Si no → usar la primera membership activa (orden alfabético por nombre).
- Si el usuario no tiene memberships activas, no se muestra TeamSwitcher; queda el `NavBrand` con label "Sin organización" y el `redirectToDashboard` cae a `/account/organizations`.

## Capabilities

### New Capabilities
<!-- Ninguna nueva — extensión de account-organizations + account-shell. -->

### Modified Capabilities

- `account-shell`: el sidebar de los shells admin y app SHALL renderizar TeamSwitcher en lugar de NavBrand cuando el usuario tiene memberships activas. Persistencia de "última org activa" via `user.lastActiveOrganizationId`.

## Impact

- **Schema**: nueva columna `user.last_active_organization_id text` (nullable) regenerada por better-auth CLI.
- **Código afectado** (~6 archivos):
  - `lib/auth/server.ts` (user.additionalFields)
  - `lib/db/schema/auth.ts` (regenerado)
  - `lib/auth/guards.ts` (helper para resolver org activa con fallback)
  - `app/admin/layout.tsx`, `app/app/layout.tsx` (cargar orgs + pasar al sidebar; resolver org activa)
  - `components/layout/app-sidebar.tsx` (aceptar prop `teams`/`activeOrgId` opcional)
  - `components/layout/team-switcher.tsx` (nuevo, client component)
  - `components/layout/team-switcher-actions.ts` (nuevo, server action `switchActiveOrganizationAction`)
- **Sin breaking changes** para usuarios existentes: si `activeOrganizationId` ya estaba seteado, la primera carga lo usa; si no, fallback a `lastActiveOrganizationId` o primera membership.
- **Migración**: `npm run db:generate-auth-schema && npm run db:push` tras merge.
