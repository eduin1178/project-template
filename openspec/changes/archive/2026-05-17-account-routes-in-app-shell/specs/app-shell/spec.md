## MODIFIED Requirements

### Requirement: Componente `AppShell` unifica el shell de rutas autenticadas

El sistema SHALL exponer un componente server-side `AppShell` en `next-app/components/layout/app-shell.tsx` con `import "server-only"`. Este componente SHALL encapsular: `TooltipProvider`, `SidebarProvider`, `AppSidebar`, `SidebarInset`, header con `SidebarTrigger` + label + `ThemeToggle`, y `Toaster`.

`AppShell` SHALL recibir props:

- `sidebarConfig: SidebarConfig` — items del sidebar (puede tener `items: []`)
- `user: { name: string; email: string; image: string | null }`
- `role: MenuRole` — para filtrar items del sidebar por rol
- `teams?: TeamsConfig` — opcional; admite `orgs: []` y `activeOrgId: null` para el caso "sin institución"
- `headerLabel: ReactNode` — copy o componente que aparece en el header (ej. `"Mi espacio"`, `"Panel admin"`, `"Plataforma Docentix"`, `<AccountHeaderLabel />`)
- `children: ReactNode`

`AppShell` SHALL ser consumido por:

- `app/[slug]/(member)/layout.tsx` (workspace member)
- `app/[slug]/admin/layout.tsx` (workspace admin)
- `app/super/(protected)/layout.tsx` (panel staff)
- `app/account/layout.tsx` (rutas de cuenta del usuario)
- `app/no-organization/page.tsx` (ruta informativa "sin institución")

NO existen otros layouts con shell-de-sidebar duplicado. Los layouts `app/(app)/layout.tsx` y `app/admin/layout.tsx` no existen.

#### Scenario: AppShell tiene un solo punto de definición
- **WHEN** se busca el código del shell (sidebar + header + toaster) en `components/layout/`
- **THEN** existe un solo componente que lo define (`app-shell.tsx`)

#### Scenario: Cada layout autenticado consume AppShell
- **WHEN** se inspeccionan `app/[slug]/(member)/layout.tsx`, `app/[slug]/admin/layout.tsx`, `app/super/(protected)/layout.tsx`, `app/account/layout.tsx` y `app/no-organization/page.tsx`
- **THEN** todos renderizan `<AppShell ...>{children}</AppShell>` (o equivalente) con configs distintas

#### Scenario: AppShell es server component
- **WHEN** se inspecciona `components/layout/app-shell.tsx`
- **THEN** NO tiene directiva `"use client"` y declara `import "server-only"`

#### Scenario: AppShell acepta `headerLabel` como ReactNode
- **WHEN** un consumidor pasa `headerLabel={<AccountHeaderLabel />}` (client component)
- **THEN** `AppShell` lo renderiza dentro del slot del header sin romper su naturaleza server-side

## ADDED Requirements

### Requirement: `TeamSwitcher` soporta estado "sin institución"

El componente `components/layout/team-switcher.tsx` SHALL renderizar un placeholder no-interactivo cuando `teams.orgs.length === 0` (o cuando no se puede resolver una `activeOrg`). El placeholder SHALL:

- Mostrar un avatar genérico (icono `BuildingsIcon` o equivalente neutral, sin nombre de institución).
- Label primario "Sin institución".
- Sublabel "No perteneces a ninguna institución".
- NO renderizar `DropdownMenu` (o renderizarlo deshabilitado sin items).

El componente SHALL NOT retornar `null` cuando no hay org; debe mantener la cuadrícula visual del sidebar header.

#### Scenario: Sin orgs muestra placeholder
- **WHEN** `TeamSwitcher` recibe `teams = { orgs: [], activeOrgId: null, onSwitch }`
- **THEN** renderiza el placeholder con avatar genérico, "Sin institución" y "No perteneces a ninguna institución", sin dropdown interactivo

#### Scenario: Con orgs mantiene comportamiento previo
- **WHEN** `TeamSwitcher` recibe al menos una org en `teams.orgs`
- **THEN** renderiza el switcher funcional con `DropdownMenu` y permite cambiar de org

### Requirement: Sidebar configs admiten variante sin items de workspace

El sistema SHALL exponer `buildAccountFallbackSidebarConfig()` en `components/layout/contexts/account.ts` (nuevo) que retorna un `SidebarConfig` con:

- `brand.label = "Docentix"`, `brand.description = "Mi cuenta"`, `brand.href = "/account/profile"`, `brand.icon = HouseIcon` (o equivalente).
- `items: []` (vacío).

Este config SHALL ser usado por el layout de cuenta cuando no hay org activa resuelta y por `/no-organization`. `AppSidebar` SHALL renderizar correctamente un `SidebarConfig` con `items: []` (sin items de workspace, solo brand + user menu).

#### Scenario: Builder fallback retorna config sin items
- **WHEN** se llama `buildAccountFallbackSidebarConfig()`
- **THEN** retorna `{ brand: { ... href: "/account/profile" ... }, items: [] }`

#### Scenario: AppSidebar renderiza items vacío sin error
- **WHEN** `AppSidebar` recibe `config.items = []`
- **THEN** renderiza el brand y el user menu sin sección de items intermedios; no lanza error
