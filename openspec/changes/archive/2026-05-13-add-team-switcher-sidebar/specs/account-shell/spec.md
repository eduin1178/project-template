## ADDED Requirements

### Requirement: TeamSwitcher en sidebar de admin/app

El sistema SHALL renderizar un componente `TeamSwitcher` en el `SidebarHeader` de los layouts `app/admin/layout.tsx` y `app/app/layout.tsx` cuando el usuario tiene al menos una membership activa. El switcher SHALL listar todas las orgs con `member.status='active'` del usuario, marcar la org activa de la sesión, y permitir cambiar a otra. El layout `super` NO renderiza el TeamSwitcher (mantiene `NavBrand`).

#### Scenario: Usuario con múltiples orgs activas
- **WHEN** un usuario con memberships activas en N>1 orgs navega a `/admin` o `/app`
- **THEN** el sidebar header muestra el TeamSwitcher con la org activa visible y al abrir lista las N orgs

#### Scenario: Usuario con una sola org activa
- **WHEN** un usuario con exactamente 1 membership activa entra al shell
- **THEN** el TeamSwitcher se renderiza igual; el dropdown lista solo esa org (sin opciones de cambio)

#### Scenario: Usuario sin orgs activas
- **WHEN** un usuario sin memberships activas entra (caso borde)
- **THEN** los layouts admin/app redirigen a `/account/organizations` antes de renderizar el sidebar (no se llega a mostrar TeamSwitcher)

#### Scenario: Super admin
- **WHEN** un super_admin navega a `/super`
- **THEN** el sidebar muestra `NavBrand` (Docentix) — NO TeamSwitcher

### Requirement: Persistencia de última org activa por usuario

El sistema SHALL persistir la última org elegida por el usuario en `user.lastActiveOrganizationId` (columna nullable agregada vía `user.additionalFields` en la config de `betterAuth`). Cada `switchActiveOrganizationAction` SHALL actualizar este campo además de `session.activeOrganizationId`.

#### Scenario: Usuario cambia de org
- **WHEN** un usuario en org A clickea "Org B" en el TeamSwitcher
- **THEN** `session.activeOrganizationId = B` y `user.lastActiveOrganizationId = B` quedan persistidos

#### Scenario: Login en sesión nueva con preferencia previa
- **WHEN** un usuario con `user.lastActiveOrganizationId = X` se loguea en una sesión nueva donde `session.activeOrganizationId` es null
- **THEN** el helper `resolveActiveOrganization` setea `session.activeOrganizationId = X` antes de renderizar el shell, siempre y cuando X siga siendo membership activa

#### Scenario: Preferencia previa apunta a org donde ya no es activo
- **WHEN** `user.lastActiveOrganizationId = Y` pero el usuario fue suspendido o removido de Y
- **THEN** el helper ignora Y y elige la primera membership activa por nombre alfabético; setea `session.activeOrganizationId` con esa elección

### Requirement: Server action `switchActiveOrganizationAction`

El sistema SHALL exponer una server action `switchActiveOrganizationAction(orgId)` que:

1. Verifica que el usuario autenticado tenga membership activa en `orgId` (rechaza con error si no).
2. Llama `auth.api.setActiveOrganization` para actualizar la sesión.
3. Actualiza `user.lastActiveOrganizationId = orgId`.
4. Llama `revalidatePath("/")` para invalidar caché server.

#### Scenario: Switch válido
- **WHEN** un usuario invoca la action con `orgId` de una membership propia y activa
- **THEN** la sesión queda con `activeOrganizationId = orgId`, el user.lastActive queda actualizado, y el cliente puede `router.refresh()` para ver el cambio

#### Scenario: Switch a org sin membership
- **WHEN** un usuario invoca la action con `orgId` de una org donde no es miembro o donde está suspendido
- **THEN** la action retorna `{ ok: false, error: '...' }` sin modificar sesión ni user

## MODIFIED Requirements

### Requirement: Layout de `/app` con sidebar

El sistema SHALL exponer `app/app/layout.tsx` que renderice el shell del panel de usuario con `AppSidebar` configurado por `appSidebarConfig` y `NavUser` con el rol derivado. El layout SHALL requerir sesión y SHALL redirigir a `/super` si el usuario es `super_admin` o a `/admin` si tiene memberships admin activas (para evitar acceso cruzado sin pasar por `deriveDashboardHref`). El layout SHALL pasar al `AppSidebar` la prop `teams` con `{ orgs, activeOrgId }` resueltos por `resolveActiveOrganization` para renderizar el `TeamSwitcher`. Si no hay memberships activas, SHALL redirigir a `/account/organizations`.

#### Scenario: Usuario regular en /app
- **WHEN** un usuario con `user.role === "user"` sin memberships admin navega a `/app`
- **THEN** se renderiza el layout con sidebar, `NavUser` con `role="user"`, y `TeamSwitcher` con sus orgs activas

#### Scenario: super_admin desviado de /app
- **WHEN** un super_admin navega a `/app`
- **THEN** se redirige a `/super`

#### Scenario: Admin de tenant desviado de /app
- **WHEN** un usuario con al menos una membership admin activa navega a `/app`
- **THEN** se redirige a `/admin`

#### Scenario: Sin memberships activas
- **WHEN** un usuario sin memberships activas (todas suspendidas o sin pertenencias) navega a `/app`
- **THEN** se redirige a `/account/organizations`
