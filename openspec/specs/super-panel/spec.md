# super-panel Specification

## Purpose

Rutas y UI del panel `/super`, login unificado en `/login`, y placeholders de `/admin` y `/app`. Toda la UI usa shadcn/ui con copy en español neutral (tú, sin voseo).

## Requirements

### Requirement: Ruta `/super` con layout propio

El sistema SHALL exponer la ruta `/super` con `app/super/layout.tsx` que actúa como shell raíz y delega a sublayouts por route group. El layout SHALL ser independiente del layout público y SHALL soportar navegación propia mediante `AppSidebar` en las rutas `(protected)`.

#### Scenario: Layout separado del público
- **WHEN** se inspecciona la estructura de `app/`
- **THEN** existe `app/super/layout.tsx` y sublayouts `app/super/(protected)/layout.tsx` y `app/super/(public)/layout.tsx` sin importar componentes de navegación pública

### Requirement: Route groups `(protected)` y `(public)` en `/super`

El segmento `/super` SHALL organizarse con dos route groups: `(protected)` para rutas que requieren `user.role === "super_admin"` y `(public)` para rutas accesibles sin autenticación (aceptación de invitación super).

#### Scenario: Estructura de carpetas
- **WHEN** se inspecciona `app/super/`
- **THEN** existen los subdirectorios `(protected)/` y `(public)/`, y la verificación de rol vive en `(protected)/layout.tsx`

#### Scenario: Layout protegido invoca `requireSuperAdmin`
- **WHEN** se inspecciona `app/super/(protected)/layout.tsx`
- **THEN** invoca un guard que verifica `user.role === "super_admin"` y llama `notFound()` si no se cumple

### Requirement: Sidebar shell en `/super`

El layout de `/super` SHALL renderizar el componente `AppSidebar` (de `components/layout/app-sidebar.tsx`) con la config del segmento super. El sidebar SHALL contener al menos el ítem "Organizaciones" enlazando a `/super/organizations` y SHALL mostrar el user menu con datos de la sesión activa.

#### Scenario: Sidebar visible en rutas protegidas
- **WHEN** un super_admin autenticado navega a cualquier ruta bajo `/super/(protected)/`
- **THEN** el `AppSidebar` se renderiza con el ítem "Organizaciones" activo si la URL coincide con `/super/organizations*`

#### Scenario: Sidebar ausente en rutas públicas
- **WHEN** un visitante navega a `/super/accept-invitation?token=...` (route group `(public)`)
- **THEN** el `AppSidebar` NO se renderiza; sólo se muestra un layout simple sin navegación

### Requirement: `/super` redirige a `/super/organizations`

El sistema SHALL exponer `app/super/(protected)/page.tsx` que, en lugar de renderizar el dashboard antiguo como contenido único, redirija a `/super/organizations` por defecto.

#### Scenario: Super_admin navega a /super
- **WHEN** un super_admin autenticado abre `/super`
- **THEN** el server redirige a `/super/organizations`

### Requirement: Login unificado en `/login`

El sistema SHALL exponer la ruta pública `/login` con formulario único para los tres roles. El formulario SHALL ofrecer email/password y botón "Continuar con Google". Post-auth, el servidor SHALL redirigir según `deriveDashboardHref(session)`.

#### Scenario: Render del login
- **WHEN** un usuario no autenticado navega a `/login`
- **THEN** ve formulario con campos email/password, botón submit, botón "Continuar con Google", enlace a "¿Olvidaste tu contraseña?"

#### Scenario: Login exitoso redirige según rol
- **WHEN** un usuario completa login exitosamente
- **THEN** el server redirige a la ruta retornada por `deriveDashboardHref(session)`

#### Scenario: Login con usuario ya autenticado
- **WHEN** un usuario autenticado navega a `/login`
- **THEN** el server redirige directamente a `deriveDashboardHref(session)` sin renderizar el formulario

### Requirement: Dashboard mínimo de super

El sistema SHALL conservar la capacidad de invitar a otros super_admins. El CTA de invitación SHALL ser accesible desde el panel super (sea como ítem del sidebar, sección dentro del listado de organizaciones, o ruta dedicada). El "dashboard mínimo" como vista única en `/super` queda reemplazado por la lista de organizaciones.

#### Scenario: CTA de invitación super accesible
- **WHEN** un super_admin autenticado navega al panel
- **THEN** existe al menos un punto de acceso para enviar invitación a otro super_admin (sin requerir conocer la URL exacta)

### Requirement: Placeholders en `/admin` y `/app`

El sistema SHALL exponer rutas `/admin` y `/app` con páginas placeholder que muestren un mensaje breve indicando que la sección está en construcción. Estas rutas SHALL estar protegidas por rol mediante el mismo patrón defense-in-depth.

#### Scenario: Acceso a /admin como admin de tenant
- **WHEN** un usuario con `member.role === "admin"` autenticado navega a `/admin`
- **THEN** ve la página placeholder

#### Scenario: Acceso a /app como user
- **WHEN** un usuario con `member.role === "member"` (o sin memberships) autenticado navega a `/app`
- **THEN** ve la página placeholder

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

### Requirement: Header del panel `/super` identifica como Plataforma

El layout `app/super/(protected)/layout.tsx` SHALL renderizar en el header del sidebar un identificador textual que comunique explícitamente que es el panel de plataforma, no un dashboard de workspace. El copy SHALL ser `"Plataforma Docentix"` o `"Panel de plataforma"` (cualquiera de los dos), en español neutral, sin voseo.

#### Scenario: Header identifica plataforma
- **WHEN** un super navega a `/super`
- **THEN** el header del shell muestra "Plataforma Docentix" o "Panel de plataforma", NO "Panel super"

### Requirement: Sidebar del panel `/super` permite volver al workspace

El sidebar configurado en `components/layout/contexts/super.ts` SHALL incluir un ítem de navegación con etiqueta `"Volver a mi institución"` y `href = "/post-login"`. El destino `/post-login` SHALL resolver al dashboard correcto vía `redirectToDashboard()` basado en la org activa del super.

#### Scenario: Clic en "Volver a mi institución" lleva al workspace
- **WHEN** un super con `activeOrganizationId === <orgPlataforma.id>` hace clic en "Volver a mi institución"
- **THEN** la navegación termina en `/admin` (porque su rol en la org plataforma es owner)

#### Scenario: Volver a workspace cuando la org activa es un tenant
- **WHEN** un super que tiene `activeOrganizationId === <orgTenantX.id>` (member) hace clic en "Volver a mi institución" desde `/super`
- **THEN** la navegación termina en `/app` (rol-en-org-activa = member)
