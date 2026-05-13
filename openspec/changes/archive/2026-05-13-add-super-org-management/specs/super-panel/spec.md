## ADDED Requirements

### Requirement: Sidebar shell en `/super`

El layout de `/super` SHALL renderizar el componente `AppSidebar` (de `components/layout/app-sidebar.tsx`) con la config del segmento super. El sidebar SHALL contener al menos el ítem "Organizaciones" enlazando a `/super/organizations` y SHALL mostrar el user menu con datos de la sesión activa.

#### Scenario: Sidebar visible en rutas protegidas
- **WHEN** un super_admin autenticado navega a cualquier ruta bajo `/super/(protected)/`
- **THEN** el `AppSidebar` se renderiza con el ítem "Organizaciones" activo si la URL coincide con `/super/organizations*`

#### Scenario: Sidebar ausente en rutas públicas
- **WHEN** un visitante navega a `/super/accept-invitation?token=...` (route group `(public)`)
- **THEN** el `AppSidebar` NO se renderiza; sólo se muestra un layout simple sin navegación

### Requirement: Route groups `(protected)` y `(public)` en `/super`

El segmento `/super` SHALL organizarse con dos route groups: `(protected)` para rutas que requieren `user.role === "super_admin"` y `(public)` para rutas accesibles sin autenticación (aceptación de invitación super).

#### Scenario: Estructura de carpetas
- **WHEN** se inspecciona `app/super/`
- **THEN** existen los subdirectorios `(protected)/` y `(public)/`, y la verificación de rol vive en `(protected)/layout.tsx`

#### Scenario: Layout protegido invoca `requireSuperAdmin`
- **WHEN** se inspecciona `app/super/(protected)/layout.tsx`
- **THEN** invoca un guard que verifica `user.role === "super_admin"` y llama `notFound()` si no se cumple

### Requirement: `/super` redirige a `/super/organizations`

El sistema SHALL exponer `app/super/(protected)/page.tsx` que, en lugar de renderizar el dashboard antiguo como contenido único, redirija a `/super/organizations` por defecto.

#### Scenario: Super_admin navega a /super
- **WHEN** un super_admin autenticado abre `/super`
- **THEN** el server redirige a `/super/organizations`

## MODIFIED Requirements

### Requirement: Ruta `/super` con layout propio

El sistema SHALL exponer la ruta `/super` con `app/super/layout.tsx` que actúa como shell raíz y delega a sublayouts por route group. El layout SHALL ser independiente del layout público y SHALL soportar navegación propia mediante `AppSidebar` en las rutas `(protected)`.

#### Scenario: Layout separado del público
- **WHEN** se inspecciona la estructura de `app/`
- **THEN** existe `app/super/layout.tsx` y sublayouts `app/super/(protected)/layout.tsx` y `app/super/(public)/layout.tsx` sin importar componentes de navegación pública

### Requirement: Dashboard mínimo de super

El sistema SHALL conservar la capacidad de invitar a otros super_admins. El CTA de invitación SHALL ser accesible desde el panel super (sea como ítem del sidebar, sección dentro del listado de organizaciones, o ruta dedicada). El "dashboard mínimo" como vista única en `/super` queda reemplazado por la lista de organizaciones.

#### Scenario: CTA de invitación super accesible
- **WHEN** un super_admin autenticado navega al panel
- **THEN** existe al menos un punto de acceso para enviar invitación a otro super_admin (sin requerir conocer la URL exacta)

### Requirement: UI consistente con shadcn/ui

Toda la UI nueva (`/super/organizations`, `/super/organizations/new`, `/super/organizations/[id]`, `/super/accept-invitation`, `/accept-invitation`) SHALL usar componentes de shadcn/ui. La copy SHALL ser español neutral con segunda persona `tú` (sin voseo). El sidebar SHALL provenir del block `sidebar-07` instalado vía shadcn CLI.

#### Scenario: Inspección de imports
- **WHEN** se inspecciona cualquiera de las páginas nuevas
- **THEN** los componentes interactivos (botones, inputs, forms, cards, tabs, dialog, table, sidebar) provienen de `@/components/ui/*`

#### Scenario: Sidebar-07 instalado
- **WHEN** se inspecciona `components/ui/sidebar.tsx`
- **THEN** existe y proviene del registry shadcn (`sidebar-07`)

#### Scenario: Copy en español neutral
- **WHEN** se revisa la copy de UI
- **THEN** usa "Ingresa", "Selecciona", "Crea", "Cuéntanos" — no "Ingresá", "Seleccioná", "Creá", "Contanos"
