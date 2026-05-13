## ADDED Requirements

### Requirement: Shell `AppSidebar` reutilizable

El proyecto SHALL exponer un componente `AppSidebar` en `components/layout/app-sidebar.tsx` basado en el block `sidebar-07` de shadcn, parametrizable mediante una prop `config: SidebarConfig`. El tipo `SidebarConfig` SHALL definir al menos: `brand` (label + href + icono opcional), `items` (array de `{ label, href, icon?, matchPrefix? }`), y `user` (name, email, image). El componente SHALL ser consumido por los layouts de `/super`, `/admin` y `/app`.

#### Scenario: Componente vive en components/layout
- **WHEN** se inspecciona `components/`
- **THEN** existe `components/layout/app-sidebar.tsx` y NO existe duplicado en `components/super/`, `components/admin/` ni `components/app/`

#### Scenario: Configs por segmento
- **WHEN** se inspecciona `components/layout/`
- **THEN** existen archivos de config por segmento (e.g. `contexts/super.ts`, `contexts/admin.ts`, `contexts/app.ts`) que exportan un `SidebarConfig` específico

#### Scenario: Sidebar instalado vía shadcn CLI
- **WHEN** se inspecciona `components/ui/sidebar.tsx`
- **THEN** existe y proviene del registry shadcn (instalado con `npx shadcn@latest add sidebar-07`)

#### Scenario: Marca el item activo según la ruta
- **WHEN** la URL coincide con el `href` o `matchPrefix` de un item de la config
- **THEN** el item se renderiza en estado activo (variante visual destacada)

### Requirement: Primitiva `EmptyState`

El proyecto SHALL exponer un componente `EmptyState` en `components/ui/empty-state.tsx` con props `icon?`, `title`, `description?`, `action?`. SHALL usarse en al menos las vistas de "sin organizaciones" y "sin invitaciones".

#### Scenario: Empty state se renderiza con todas las props
- **WHEN** se renderiza `<EmptyState icon={...} title="..." description="..." action={<Button>...</Button>} />`
- **THEN** se muestra icono centrado arriba, título prominente, descripción debajo, y action al pie

#### Scenario: Empty state mínimo
- **WHEN** se renderiza `<EmptyState title="..." />`
- **THEN** se muestra sólo el título sin romper el layout

#### Scenario: Vive en components/ui
- **WHEN** se inspecciona `components/ui/`
- **THEN** existe `empty-state.tsx` (es una primitiva, no una composición de dominio)

### Requirement: Stubs de sidebar en /admin y /app

Los layouts de `/admin` y `/app` SHALL consumir `AppSidebar` con configs propias que contengan al menos un ítem placeholder. El objetivo SHALL ser que el shell esté listo para crecer en fases posteriores sin refactor del layout.

#### Scenario: /admin renderiza sidebar
- **WHEN** un usuario con `member.role === "admin"` navega a `/admin`
- **THEN** el layout renderiza `AppSidebar` con la config de admin (al menos un ítem visible, aunque sea placeholder)

#### Scenario: /app renderiza sidebar
- **WHEN** un usuario `user` navega a `/app`
- **THEN** el layout renderiza `AppSidebar` con la config de app (al menos un ítem visible, aunque sea placeholder)
