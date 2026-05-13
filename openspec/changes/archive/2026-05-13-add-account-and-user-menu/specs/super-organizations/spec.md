## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Campo `logo` en la tabla `organization`

La tabla `organization` SHALL incluir una columna `logo` (text nullable) para almacenar la URL pública del logo. La columna SHALL ser provista por el plugin `organization` de better-auth; si no lo está en la versión instalada, SHALL agregarse vía migración Drizzle.

#### Scenario: Columna presente en schema
- **WHEN** se inspecciona el schema generado por Drizzle
- **THEN** la tabla `organization` tiene la columna `logo` (text, nullable)

#### Scenario: Logo opcional al crear org
- **WHEN** el super_admin crea una organización sin proveer logo
- **THEN** la fila se persiste con `logo = null` y la creación es exitosa
