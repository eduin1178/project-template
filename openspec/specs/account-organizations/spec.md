# account-organizations Specification

## Purpose

Listado y detalle de organizaciones del usuario en `/account/organizations`. Cada usuario ve sus membresías, accede al detalle de cada org (con tabs de miembros e invitaciones), y los admins de tenant pueden editar `name`/`logo`, invitar nuevos miembros y gestionar invitaciones pendientes desde esta ruta.

## Requirements

### Requirement: Ruta `/account/organizations` con lista por usuario

El sistema SHALL exponer `app/account/organizations/page.tsx` que liste todas las organizaciones donde el usuario autenticado tiene un registro en `member`. Cada fila SHALL mostrar `logo`, `name`, `slug`, fecha de incorporación, y un badge "admin" si `member.role === "admin"` o `member.role === "owner"`.

#### Scenario: Usuario con múltiples membresías
- **WHEN** un usuario autenticado con membresías en N organizaciones navega a `/account/organizations`
- **THEN** la página lista las N organizaciones; aquellas donde es admin u owner muestran badge "admin"

#### Scenario: Empty state
- **WHEN** un usuario sin membresías navega a `/account/organizations`
- **THEN** se renderiza `EmptyState` con título "No perteneces a ninguna organización" y descripción guía

#### Scenario: super_admin no accede a la ruta
- **WHEN** un usuario con `user.role === "super_admin"` navega a `/account/organizations`
- **THEN** la página renderiza un mensaje "Esta sección no aplica para super administradores" y CTA hacia `/super`; el item del menú de usuario está oculto para este rol

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

### Requirement: Edición de organización por admin

El sistema SHALL permitir a usuarios con `member.role` en `{"admin", "owner"}` editar `name` y `logo` de su organización desde el header del detalle. El `slug` SHALL ser read-only. La server action SHALL invocar `auth.api.organization.update` (o equivalente Drizzle si el plugin no expone el campo) tras verificar membership y rol.

#### Scenario: Admin actualiza name
- **WHEN** un admin envía el form de edición con `name` distinto al actual
- **THEN** la action verifica `member.role` admin/owner para esa org, persiste el cambio, y la UI refleja el nuevo nombre

#### Scenario: Member intenta editar
- **WHEN** un usuario con `member.role === "member"` invoca la action de edición
- **THEN** la action lanza error de autorización sin tocar la BD

#### Scenario: Edición de slug bloqueada
- **WHEN** el form se envía con un valor de `slug` distinto al persistido
- **THEN** la action ignora el campo `slug` y solo actualiza los campos editables; o rechaza explícitamente si llegó al body por bypass de UI

### Requirement: Upload de logo a R2

La edición de logo SHALL aceptar un archivo de imagen (PNG/JPEG/WebP/SVG, ≤ 1 MB), subirlo a R2 mediante `lib/storage/r2.ts`, y persistir la URL pública resultante en `organization.logo`. El logo previo SHALL borrarse best-effort después de persistir el nuevo.

#### Scenario: Upload válido
- **WHEN** un admin sube un PNG de 500 KB como logo
- **THEN** la action lo sube a R2 con key `org-logos/{organizationId}/{uuid}.png`, persiste la URL pública en `organization.logo`, e intenta borrar el logo previo si existía

#### Scenario: Archivo demasiado grande
- **WHEN** se envía un archivo > 1 MB
- **THEN** la action rechaza con error "El archivo supera el tamaño máximo de 1 MB" sin tocar R2 ni BD

#### Scenario: MIME no soportado
- **WHEN** se envía un archivo con `Content-Type` fuera del set permitido
- **THEN** la action rechaza con error "Formato no soportado"

#### Scenario: Fallo al borrar logo previo
- **WHEN** el nuevo logo se sube y persiste pero el borrado del anterior falla
- **THEN** la operación completa retorna éxito; el error de borrado se loggea pero no se propaga al usuario

### Requirement: Creación de invitación por admin de tenant

El sistema SHALL exponer una server action `createTenantInvitation({ organizationId, email, role })` accesible para admins/owners de esa org. La invitación SHALL persistirse en la tabla nativa `invitation` con `inviterId = session.user.id`, `expiresAt` a 7 días, `status = "pending"`, y `role ∈ {"admin", "member"}`. SHALL enviarse email al `email` invitado con link a `/accept-invitation?invitationId={id}`.

#### Scenario: Admin invita member
- **WHEN** un admin envía el form de invitación con `email` y `role = "member"`
- **THEN** se crea la fila en `invitation`, se envía email, y la UI actualiza el tab Invitaciones

#### Scenario: Admin invita otro admin
- **WHEN** un admin envía el form con `role = "admin"`
- **THEN** la invitación se crea con `role = "admin"`; la aceptación creará un `member` con rol admin

#### Scenario: Member intenta invitar
- **WHEN** un usuario con `member.role === "member"` invoca la action
- **THEN** la action lanza error de autorización

#### Scenario: Email ya invitado pending
- **WHEN** existe ya una invitación pending no expirada para el mismo `email` y `organizationId`
- **THEN** la action rechaza con error "Ya existe una invitación pendiente para este email"

### Requirement: Gestión de invitaciones por admin de tenant

Los admins SHALL poder, sobre invitaciones de su organización: copiar el link de aceptación, reenviar el email, y eliminar la fila si está pending. Las server actions SHALL verificar `member.role` admin/owner para la `organizationId` afectada antes de ejecutar.

#### Scenario: Copiar link
- **WHEN** un admin clickea "Copiar link" en una invitación
- **THEN** el portapapeles recibe `${origin}/accept-invitation?invitationId={id}` y un toast lo confirma

#### Scenario: Reenviar pending
- **WHEN** un admin reenvía una invitación `pending` no expirada
- **THEN** se dispara el envío del email con el mismo `invitationId` y `expiresAt` (sin rotar)

#### Scenario: Eliminar pending
- **WHEN** un admin elimina una invitación `pending`
- **THEN** la fila se borra de `invitation` y la UI la quita del tab

#### Scenario: Intentar gestionar invitación de otra org
- **WHEN** un admin invoca `resend` o `delete` con un `invitationId` de una org donde no es admin
- **THEN** la action lanza error de autorización sin tocar BD
