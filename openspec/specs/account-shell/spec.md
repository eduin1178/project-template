# account-shell Specification

## Purpose

Shell compartido para las rutas `/account/*` y el menú de usuario orientado por rol. Incluye el layout que requiere sesión y enlaza al panel correcto, la función `deriveMenuRole` y la configuración del `NavUser`, la unificación del sign-out y el layout del panel `/app`.

## Requirements

### Requirement: Layout compartido `/account/*`

El sistema SHALL exponer `app/account/layout.tsx` que envuelva todas las rutas bajo `/account/*`. El layout SHALL: (a) requerir sesión (redirige a `/login` si no la hay), (b) renderizar un header con título "Mi cuenta" y un enlace "← Volver al panel" calculado vía `deriveDashboardHref(session)`, (c) renderizar el contenido sin sidebar de rol.

#### Scenario: Acceso sin sesión
- **WHEN** un visitante sin cookie de sesión navega a `/account/*`
- **THEN** el layout redirige a `/login`

#### Scenario: Volver al panel correcto
- **WHEN** un super_admin abre `/account/profile`
- **THEN** el enlace "Volver al panel" apunta a `/super`

#### Scenario: Volver al panel admin
- **WHEN** un admin de tenant abre `/account/profile`
- **THEN** el enlace "Volver al panel" apunta a `/admin`

#### Scenario: Volver al panel user
- **WHEN** un usuario regular abre `/account/profile`
- **THEN** el enlace "Volver al panel" apunta a `/app`

### Requirement: NavUser orientado por rol

El componente `components/layout/nav-user.tsx` SHALL aceptar una prop `role: "super_admin" | "admin" | "user"` y SHALL renderizar items de menú según una función pura `getUserMenuItems(role)` definida en `lib/auth/role-menu.ts`. Cada item del menú SHALL ser un enlace a una ruta `/account/*` salvo "Cerrar sesión", que SHALL ser un botón dentro de un `<form action={signOutAction}>`.

#### Scenario: Menú de super_admin
- **WHEN** se renderiza `NavUser` con `role="super_admin"`
- **THEN** los items son: "Mi perfil" → `/account/profile`, "Invitaciones" → `/account/invitations`, "Cerrar sesión"

#### Scenario: Menú de admin
- **WHEN** se renderiza `NavUser` con `role="admin"`
- **THEN** los items son: "Mi perfil", "Mis organizaciones" → `/account/organizations`, "Invitaciones", "Cerrar sesión"

#### Scenario: Menú de user
- **WHEN** se renderiza `NavUser` con `role="user"`
- **THEN** los items son: "Mi perfil", "Mis organizaciones", "Invitaciones", "Cerrar sesión"

### Requirement: Cálculo de rol del usuario para el menú

El sistema SHALL exponer una función `deriveMenuRole(session, memberships)` que retorna `"super_admin"` si `session.user.role === "super_admin"`, `"admin"` si existe alguna `member` con `role` en `{"admin", "owner"}`, o `"user"` en otro caso. Los layouts `/super`, `/admin`, `/app` y `/account` SHALL invocar esta función para pasar la prop `role` al `NavUser`.

#### Scenario: super_admin retorna super_admin
- **WHEN** `deriveMenuRole` recibe una sesión con `user.role === "super_admin"`
- **THEN** retorna `"super_admin"` sin inspeccionar memberships

#### Scenario: Usuario con membership admin
- **WHEN** `deriveMenuRole` recibe `user.role === "user"` y al menos una membership con `role === "admin"`
- **THEN** retorna `"admin"`

#### Scenario: Usuario sin memberships admin
- **WHEN** `deriveMenuRole` recibe `user.role === "user"` sin memberships admin
- **THEN** retorna `"user"`

### Requirement: Sign-out unificado en `lib/auth/actions.ts`

El sistema SHALL mantener una única implementación de `signOutAction` en `lib/auth/actions.ts`. El archivo `app/super/actions-session.ts` SHALL ser eliminado y sus consumidores SHALL importar de `@/lib/auth/actions`.

#### Scenario: Archivo duplicado eliminado
- **WHEN** se inspecciona el repo tras esta change
- **THEN** `app/super/actions-session.ts` no existe y ningún archivo lo importa

#### Scenario: Sign-out funciona desde los tres paneles
- **WHEN** un usuario autenticado (super_admin, admin o user) clickea "Cerrar sesión" desde cualquier panel o desde `/account`
- **THEN** se invoca la misma action, la sesión se invalida y se redirige a `/login`

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
