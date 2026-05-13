## ADDED Requirements

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

El sistema SHALL exponer `app/account/organizations/[id]/page.tsx` accesible solo si el usuario tiene un registro en `member` para esa `organizationId`. Si no, SHALL invocar `notFound()`. La página SHALL renderizar header con `logo`, `name`, `slug`, fecha de creación, y tabs "Miembros" e "Invitaciones".

#### Scenario: Miembro accede a su org
- **WHEN** un usuario miembro de la org navega al detalle
- **THEN** se renderiza el header con datos y los tabs cargados

#### Scenario: No miembro
- **WHEN** un usuario sin membresía navega a `/account/organizations/{id}`
- **THEN** se invoca `notFound()`

#### Scenario: Tab Miembros
- **WHEN** se abre el tab "Miembros"
- **THEN** se listan filas con `name`, `email`, `role` y fecha de incorporación; el usuario actual aparece marcado "(tú)"

#### Scenario: Tab Invitaciones
- **WHEN** se abre el tab "Invitaciones"
- **THEN** se listan invitaciones con `email`, `role`, `status`, `expiresAt`; las acciones (copiar link, reenviar, eliminar) solo aparecen para admin

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
