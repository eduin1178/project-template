# super-organizations Specification

## Purpose

CRUD de organizaciones (tenants) operado por super_admins desde `/super`: listado con empty state, creación de org con invitación al admin en un solo paso, y vista de detalle con tabs nativos de miembros (`member`) e invitaciones (`invitation`) del plugin `organization` de better-auth.

## Requirements

### Requirement: Ruta `/super/organizations` con lista

El sistema SHALL exponer `app/super/(protected)/organizations/page.tsx` que renderice la lista de organizaciones existentes (tabla `organization` del plugin `organization` de better-auth). La página SHALL ser accesible sólo para `user.role === "super_admin"`.

#### Scenario: Super_admin ve la lista
- **WHEN** un super_admin autenticado navega a `/super/organizations`
- **THEN** ve una tabla/lista con `name`, `slug`, `createdAt` y un indicador de si la org tiene admin activo

#### Scenario: Usuario sin rol super_admin recibe 404
- **WHEN** un usuario sin rol `super_admin` navega a `/super/organizations`
- **THEN** el layout `(protected)` invoca `notFound()`

### Requirement: Empty state cuando no hay organizaciones

Cuando la consulta de organizaciones retorna cero filas, la página SHALL renderizar el componente `EmptyState` (de `components/ui/empty-state.tsx`) con copy en español neutral y un CTA primario hacia `/super/organizations/new`.

#### Scenario: BD sin organizaciones
- **WHEN** un super_admin navega a `/super/organizations` y `count(organization) === 0`
- **THEN** se renderiza `EmptyState` con título "Aún no tienes organizaciones", descripción explicativa, y botón "Crear organización" que enlaza a `/super/organizations/new`

### Requirement: Crear organización + invitación al admin en un solo paso

El sistema SHALL exponer `app/super/(protected)/organizations/new/page.tsx` con un formulario que pida: `name`, `slug` (autogenerado desde `name`, editable), `adminName`, `adminEmail`. Al enviar, una server action SHALL: (a) verificar `requireSuperAdmin`, (b) crear la organización, (c) emitir una invitación con `role = "admin"` para `adminEmail`, (d) enviar email con link a `/accept-invitation?invitationId=...`.

#### Scenario: Creación exitosa
- **WHEN** un super_admin envía el formulario con datos válidos
- **THEN** la organización se crea, se persiste una invitación `pending`, se envía el email, y la respuesta redirige a `/super/organizations/[id]` mostrando la nueva org con su invitación pending

#### Scenario: Slug duplicado
- **WHEN** el `slug` enviado ya existe en `organization`
- **THEN** la server action rechaza con error de validación, no crea la org ni la invitación, y el formulario muestra el error inline

#### Scenario: Falla en envío de email
- **WHEN** la org y la invitación se crearon pero el envío de email falla
- **THEN** la org y la invitación persisten, se muestra warning al super con CTA para "Copiar link de invitación" y "Reenviar"

#### Scenario: Super_admin no pertenece a la org creada
- **WHEN** la organización se crea exitosamente
- **THEN** no existe ninguna fila en `member` que relacione `super.id` con la nueva `organization.id`

### Requirement: Detalle de organización con tabs

El sistema SHALL exponer `app/super/(protected)/organizations/[id]/page.tsx` que renderice un header con `logo` (si existe), `name`, `slug`, fecha de creación y dos tabs: "Miembros" e "Invitaciones". El `logo` SHALL mostrarse read-only en el panel super; la edición de `logo` corresponde al admin de tenant en `/account/organizations/[id]`.

#### Scenario: Tab Miembros lista filas de `member`
- **WHEN** el super_admin abre el tab "Miembros"
- **THEN** se listan todos los registros de `member` para esa `organizationId` con `name`, `email`, `role` (admin/member), y fecha de incorporación

#### Scenario: Tab Invitaciones lista filas de `invitation`
- **WHEN** el super_admin abre el tab "Invitaciones"
- **THEN** se listan todos los registros de `invitation` para esa `organizationId` con `email`, `role`, `status` (pending/accepted/expired/rejected), `expiresAt`, y las acciones disponibles (copiar link, reenviar, eliminar)

#### Scenario: Org sin admin se marca visualmente
- **WHEN** una organización no tiene ningún miembro con `role = "admin"`
- **THEN** el header muestra un badge "Sin admin" y el tab Invitaciones queda destacado si hay invitaciones pendientes

#### Scenario: Org inexistente devuelve 404
- **WHEN** se navega a `/super/organizations/{id}` con un `id` que no existe
- **THEN** el server invoca `notFound()`

#### Scenario: Logo de la organización mostrado en header
- **WHEN** la organización tiene `logo` no nulo
- **THEN** el header muestra el logo como imagen junto al `name`

#### Scenario: Sin logo cargado
- **WHEN** la organización tiene `logo` nulo o vacío
- **THEN** el header muestra un placeholder con las iniciales del nombre de la organización

### Requirement: Campo `logo` en la tabla `organization`

La tabla `organization` SHALL incluir una columna `logo` (text nullable) para almacenar la URL pública del logo. La columna SHALL ser provista por el plugin `organization` de better-auth; si no lo está en la versión instalada, SHALL agregarse vía migración Drizzle.

#### Scenario: Columna presente en schema
- **WHEN** se inspecciona el schema generado por Drizzle
- **THEN** la tabla `organization` tiene la columna `logo` (text, nullable)

#### Scenario: Logo opcional al crear org
- **WHEN** el super_admin crea una organización sin proveer logo
- **THEN** la fila se persiste con `logo = null` y la creación es exitosa
