## ADDED Requirements

### Requirement: Componente `AppShell` unifica el shell de rutas autenticadas

El sistema SHALL exponer un componente server-side `AppShell` en `next-app/components/layout/app-shell.tsx` con `import "server-only"`. Este componente SHALL encapsular: `TooltipProvider`, `SidebarProvider`, `AppSidebar`, `SidebarInset`, header con `SidebarTrigger` + label + `ThemeToggle`, y `Toaster`.

`AppShell` SHALL recibir props:

- `sidebarConfig: SidebarConfig` — items del sidebar
- `user: { name: string; email: string; image: string | null }`
- `role: MenuRole` — para filtrar items del sidebar por rol
- `teams?: TeamSwitcherProps` — opcional; el panel `/super` no recibe teams si decide no mostrar el switcher
- `headerLabel: string` — copy que aparece en el header (ej. "Mi espacio", "Panel admin", "Plataforma Docentix")
- `children: ReactNode`

`AppShell` SHALL ser consumido por:

- `app/[slug]/layout.tsx` (workspace member)
- `app/[slug]/admin/layout.tsx` (workspace admin)
- `app/super/(protected)/layout.tsx` (panel staff)

NO existen otros layouts con shell-de-sidebar duplicado. Los layouts `app/(app)/layout.tsx` y `app/admin/layout.tsx` SHALL ser eliminados.

#### Scenario: AppShell tiene un solo punto de definición
- **WHEN** se busca el código del shell (sidebar + header + toaster) en `components/layout/`
- **THEN** existe un solo componente que lo define (`app-shell.tsx`)

#### Scenario: Cada layout autenticado consume AppShell
- **WHEN** se inspecciona `app/[slug]/layout.tsx`, `app/[slug]/admin/layout.tsx`, `app/super/(protected)/layout.tsx`
- **THEN** los tres renderizan `<AppShell ...>{children}</AppShell>` con configs distintas

#### Scenario: AppShell es server component
- **WHEN** se inspecciona `components/layout/app-shell.tsx`
- **THEN** NO tiene directiva `"use client"` y declara `import "server-only"`

### Requirement: Sidebar config con placeholder de slug

Los items del sidebar de workspace (`appSidebarConfig`, `adminSidebarConfig`) SHALL usar el placeholder literal `{slug}` en sus hrefs. El componente `AppSidebar` SHALL recibir un prop `slug: string | null` y reemplazar `{slug}` en cada href al renderizar.

Items que sean rutas globales (no scoped al workspace) SHALL tener hrefs absolutos sin placeholder (ej. `/super`, `/account/profile`).

#### Scenario: Config tiene placeholder de slug
- **WHEN** se inspecciona `components/layout/contexts/app.ts`
- **THEN** los items que apuntan a rutas de workspace usan `{slug}` en `href` (ej. `href: "/{slug}/tasks"`)

#### Scenario: Render del sidebar resuelve slug
- **WHEN** `AppSidebar` renderiza con `slug="docentix"`
- **THEN** los hrefs `{slug}` se reemplazan por `"docentix"`; los hrefs absolutos no se tocan

### Requirement: Ítem condicional "Panel de plataforma" en sidebar

El sidebar de workspace SHALL incluir un ítem con label `"Panel de plataforma"` y `href = "/super"` cuando el usuario tiene `user.role === "super_admin"`. Para usuarios sin esa capacidad, el ítem NO aparece. El filtrado por rol vive en `AppSidebar` (usa el `role` que ya recibe vía `deriveMenuRole`).

#### Scenario: Super ve "Panel de plataforma"
- **WHEN** un super con `user.role === "super_admin"` carga `/<slug>` o `/<slug>/admin`
- **THEN** el sidebar muestra el ítem "Panel de plataforma" con href `/super`

#### Scenario: User regular no ve "Panel de plataforma"
- **WHEN** un usuario con `user.role === "user"` carga `/<slug>`
- **THEN** el sidebar NO incluye el ítem "Panel de plataforma"

### Requirement: Ítem "Volver a mi institución" en `/super`

El sidebar de `/super` (`superSidebarConfig`) SHALL incluir un ítem con label `"Volver a mi institución"` cuyo `href` es:

- `/<slugDeActiveOrg>` cuando la sesión tiene `activeOrganizationId` resoluble a slug
- `/post-login` como fallback

Este `href` SHALL resolverse en el server al construir la sidebarConfig (no en el cliente).

#### Scenario: Super con org activa navega a /<slug>
- **WHEN** un super con `session.activeOrganizationId === <docentix.id>` está en `/super` y clica "Volver a mi institución"
- **THEN** la navegación termina en `/docentix`

#### Scenario: Super sin activeOrg cae a /post-login
- **WHEN** el sidebar se construye sin org activa resoluble
- **THEN** el `href` del ítem es `/post-login`
