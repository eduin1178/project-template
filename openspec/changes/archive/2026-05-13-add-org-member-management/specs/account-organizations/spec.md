## ADDED Requirements

### Requirement: Estado activo/inactivo por miembro

El sistema SHALL persistir un estado por membresía en la columna `member.status` con valores `active` (default) e `inactive`. La columna SHALL declararse vía `additionalFields` del plugin `organization` de better-auth en `lib/auth/server.ts`, NO mediante edición manual de `lib/db/schema/auth.ts`.

#### Scenario: Default al crear membership
- **WHEN** se crea una nueva membership (alta directa o aceptación de invitación)
- **THEN** la fila queda con `status = 'active'` sin que el código de aplicación lo seteé explícitamente

#### Scenario: Migración no destructiva
- **WHEN** se aplica la migración que agrega `status`
- **THEN** todas las memberships existentes quedan con `status = 'active'` por la cláusula `default 'active'`

### Requirement: Cambio de rol por admin/owner

El sistema SHALL exponer una server action `updateMemberRoleAction({ memberId, role })` que permita a admins/owners de la organización del miembro cambiar su rol entre `admin` y `member`. La action SHALL rechazar:

- Llamadas de usuarios que no sean admin/owner de esa org (con `status = 'active'`).
- Cambio del rol propio del actor.
- Degradación a `member` del último miembro `admin`/`owner` con `status = 'active'` de la organización.

#### Scenario: Admin promueve a otro miembro
- **WHEN** un admin invoca la action con `role = 'admin'` sobre un miembro existente con rol `member`
- **THEN** la fila `member` queda con `role = 'admin'` y se revalida la ruta del detalle

#### Scenario: Admin intenta degradar al último admin/owner activo
- **WHEN** un admin invoca la action con `role = 'member'` sobre un miembro que es el último `admin`/`owner` activo de la org
- **THEN** la action retorna `{ ok: false, error: '...' }` sin modificar la BD

#### Scenario: Admin intenta cambiar su propio rol
- **WHEN** un admin invoca la action con `memberId` que corresponde a su propia membership
- **THEN** la action retorna `{ ok: false, error: 'No puedes cambiar tu propio rol.' }` sin modificar la BD

#### Scenario: Member común intenta cambiar rol
- **WHEN** un usuario con `member.role = 'member'` invoca la action
- **THEN** la action retorna error de autorización sin tocar la BD

### Requirement: Suspender / reactivar miembro por admin/owner

El sistema SHALL exponer una server action `setMemberStatusAction({ memberId, status })` que permita a admins/owners de la organización pausar o reactivar el acceso de un miembro a esa org cambiando `member.status` entre `'active'` e `'inactive'`. La action SHALL rechazar:

- Llamadas de usuarios que no sean admin/owner activo de esa org.
- Cambio del propio status.
- `inactive` sobre el último miembro `admin`/`owner` con `status = 'active'`.

#### Scenario: Admin suspende a un miembro
- **WHEN** un admin invoca la action con `status = 'inactive'` sobre un member común
- **THEN** la fila `member` queda con `status = 'inactive'` y se revalida la ruta

#### Scenario: Admin reactiva a un miembro suspendido
- **WHEN** un admin invoca la action con `status = 'active'` sobre un miembro inactivo
- **THEN** la fila `member` queda con `status = 'active'`

#### Scenario: Admin intenta suspender al último admin activo
- **WHEN** un admin invoca la action con `status = 'inactive'` sobre el único `admin`/`owner` con `status='active'` de la org
- **THEN** la action retorna `{ ok: false, error: '...' }` sin modificar la BD

#### Scenario: Admin intenta suspenderse a sí mismo
- **WHEN** un admin invoca la action sobre su propia membership
- **THEN** la action retorna `{ ok: false, error: 'No puedes suspender tu propio acceso.' }` sin modificar la BD

### Requirement: Revocación inmediata por guard

Las rutas y actions que requieren membership en una organización SHALL tratar las memberships con `status = 'inactive'` como inexistentes a efectos de autorización. La revocación SHALL ser efectiva en el siguiente request del usuario suspendido, sin necesidad de invalidar su sesión global.

#### Scenario: Helper `loadActiveMembershipsFor`
- **WHEN** el guard `loadActiveMembershipsFor(userId)` se invoca
- **THEN** retorna solo memberships con `status = 'active'`

#### Scenario: `requireTenantAdminFor` ignora admins inactivos
- **WHEN** un admin que fue suspendido (`status = 'inactive'`) invoca una server action protegida por `requireTenantAdminFor(orgId)`
- **THEN** la action lanza error de autorización aunque su rol siga siendo `admin`/`owner`

#### Scenario: Layouts del shell autenticado usan filtro activo
- **WHEN** un usuario con todas sus memberships inactivas accede a `/admin` o `/app`
- **THEN** el layout lo redirige hacia un destino sin tenant (p. ej. `/account/organizations`) — nunca renderiza el panel del tenant

### Requirement: Página de suspensión

El sistema SHALL exponer la ruta `/account/suspended` que se muestra cuando el usuario navega a un contexto de tenant donde su membership está inactiva. La página SHALL mostrar el nombre de la organización (recibido vía query param `org=<id>`), el motivo "Tu acceso fue suspendido" y un CTA para volver a `/account/organizations`.

#### Scenario: Usuario suspendido en su org activa
- **WHEN** un usuario con `session.activeOrganizationId = X` y `member.status = 'inactive'` para X navega a una ruta del tenant
- **THEN** el guard redirige a `/account/suspended?org=X`

#### Scenario: Vista de la página de suspensión
- **WHEN** la ruta `/account/suspended?org=X` se renderiza
- **THEN** muestra el `name` de la org X (consultado desde `organization` por id), copy "Tu acceso a {nombre} fue suspendido. Contacta al administrador." y botón "Volver a mis organizaciones"

### Requirement: Listado de organizaciones distingue suspendidas

El listado en `/account/organizations` SHALL incluir todas las memberships del usuario (activas e inactivas) y marcar las inactivas con un badge "Suspendida". El link al detalle de una org suspendida SHALL llevar a `/account/suspended?org=<id>` en vez del detalle.

#### Scenario: Mix activas/inactivas
- **WHEN** un usuario con membership activa en A y suspendida en B navega a `/account/organizations`
- **THEN** ambas aparecen; A sin badge especial, B con badge "Suspendida"

#### Scenario: Click en org suspendida
- **WHEN** el usuario clickea en una org marcada "Suspendida"
- **THEN** la navegación lo lleva a `/account/suspended?org=<id>`, no al detalle

## MODIFIED Requirements

### Requirement: Detalle de organización en `/account/organizations/[id]`

El sistema SHALL exponer `app/account/organizations/[id]/page.tsx` accesible solo si el usuario tiene un registro en `member` para esa `organizationId` con `status = 'active'`. Si no, SHALL invocar `notFound()` (membership inexistente) o redirigir a `/account/suspended?org=<id>` (membership inactiva). La página SHALL renderizar header con `logo`, `name`, `slug`, fecha de creación, y tabs "Miembros" e "Invitaciones".

#### Scenario: Miembro activo accede a su org
- **WHEN** un usuario con membership `status='active'` en la org navega al detalle
- **THEN** se renderiza el header con datos y los tabs cargados

#### Scenario: Miembro suspendido accede al detalle
- **WHEN** un usuario con membership `status='inactive'` en la org navega al detalle
- **THEN** la página redirige a `/account/suspended?org=<id>`

#### Scenario: No miembro
- **WHEN** un usuario sin membresía navega a `/account/organizations/{id}`
- **THEN** se invoca `notFound()`

#### Scenario: Tab Miembros
- **WHEN** se abre el tab "Miembros"
- **THEN** se listan filas con `name`, `email`, `role`, `status` (badge "Activo"/"Suspendido") y fecha de incorporación; el usuario actual aparece marcado "(tú)"; cuando el viewer es admin/owner activo, cada fila muestra un menú de acciones con "Cambiar rol" y "Suspender/Reactivar" sujeto a las reglas de las server actions

#### Scenario: Tab Invitaciones
- **WHEN** se abre el tab "Invitaciones"
- **THEN** se listan invitaciones con `email`, `role`, `status`, `expiresAt`; las acciones (copiar link, reenviar, eliminar) solo aparecen para admin
