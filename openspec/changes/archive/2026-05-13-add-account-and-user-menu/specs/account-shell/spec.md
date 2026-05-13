## ADDED Requirements

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

El sistema SHALL exponer `app/app/layout.tsx` que renderice el shell del panel de usuario con `AppSidebar` configurado por `appSidebarConfig` y `NavUser` con el rol derivado. El layout SHALL requerir sesión y SHALL redirigir a `/super` si el usuario es `super_admin` o a `/admin` si tiene memberships admin (para evitar acceso cruzado sin pasar por `deriveDashboardHref`).

#### Scenario: Usuario regular en /app
- **WHEN** un usuario con `user.role === "user"` sin memberships admin navega a `/app`
- **THEN** se renderiza el layout con sidebar y `NavUser` con `role="user"`

#### Scenario: super_admin desviado de /app
- **WHEN** un super_admin navega a `/app`
- **THEN** se redirige a `/super`

#### Scenario: Admin de tenant desviado de /app
- **WHEN** un usuario con al menos una membership admin navega a `/app`
- **THEN** se redirige a `/admin`
