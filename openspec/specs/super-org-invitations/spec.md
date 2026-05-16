# super-org-invitations Specification

## Purpose

Ciclo de vida de invitaciones de administrador de organización originadas por el super_admin. Reutiliza la tabla `invitation` nativa del plugin `organization` de better-auth (sin tabla propia), expone la aceptación en la ruta pública `/accept-invitation` con flujos para usuarios nuevos (email/password y Google) y usuarios existentes, y permite copiar link, reenviar y eliminar invitaciones pendientes desde el detalle de la org.

## Requirements

### Requirement: Invitación de admin de org usa tabla nativa `invitation`

El sistema SHALL usar la tabla `invitation` del plugin `organization` de better-auth para representar invitaciones de admin de org. Cada fila SHALL tener `role = "admin"`, `organizationId` apuntando a la org destino, `inviterId` apuntando al super_admin, `expiresAt` a 7 días desde la creación, y `status = "pending"` al crearse.

#### Scenario: Schema reutilizado
- **WHEN** se inspecciona la BD tras crear una org desde `/super/organizations/new`
- **THEN** existe una fila en `invitation` con `role = "admin"`, `status = "pending"`, `organizationId` correcto e `inviterId` igual al `id` del super_admin

#### Scenario: Sin tabla propia
- **WHEN** se inspecciona `lib/db/schema/`
- **THEN** NO existe una tabla nueva tipo `orgAdminInvitation`; sólo se referencian las tablas del plugin

### Requirement: Creación por super_admin sin membership

La server action `createOrganizationWithAdmin` SHALL permitir al super_admin crear la invitación sin estar registrado como `member` de la org. La autorización SHALL provenir del plugin `admin` (`adminRoles: ["super_admin"]`) o, como fallback, de un insert directo server-side en la tabla `invitation`.

#### Scenario: Super_admin crea invitación
- **WHEN** un super_admin autenticado invoca la action con datos válidos
- **THEN** se crea la fila en `invitation` con `inviterId = super.id` aunque el super no exista en `member` para esa org

#### Scenario: Usuario sin rol super_admin es rechazado
- **WHEN** un usuario con `user.role !== "super_admin"` invoca la action
- **THEN** la action lanza error de autorización sin tocar la BD

### Requirement: Aceptación pública en `/accept-invitation`

El sistema SHALL exponer la ruta pública `/accept-invitation?invitationId={id}` que valide la invitación (existe, `status = "pending"`, no expirada) y permita aceptar de forma atómica.

#### Scenario: Invitación válida renderiza UI de aceptación
- **WHEN** un usuario no autenticado navega con `invitationId` válido
- **THEN** se renderiza un formulario de signup pre-llenado con el `email` de la invitación (editable) y opciones de email/password o "Continuar con Google"

#### Scenario: Invitación válida y usuario logueado
- **WHEN** un usuario autenticado navega con `invitationId` válido
- **THEN** se renderiza un botón "Aceptar invitación" que ejecuta la aceptación inmediata sin pasar por signup

#### Scenario: Invitación inválida, expirada o aceptada
- **WHEN** el `invitationId` no existe, `expiresAt < now`, o `status !== "pending"`
- **THEN** se renderiza mensaje de error específico y CTA hacia `/login`

### Requirement: Aceptación atómica y rol admin asignado

La aceptación SHALL ocurrir en una transacción que: (a) re-valide la invitación, (b) cree o asocie al `user`, (c) cree el `member` con `role = "admin"` y `organizationId` correcto, (d) marque la invitación con `status = "accepted"`. Si cualquier paso falla, todo se revierte.

#### Scenario: Aceptación con email/password (usuario nuevo)
- **WHEN** el usuario envía el form de signup con `invitationId` válido
- **THEN** en una transacción se crea `user` (con `role = "user"` por defecto), `account` con password, `member` con `role = "admin"` para la `organizationId` invitada, y la invitación queda `accepted`

#### Scenario: Aceptación con Google (usuario nuevo)
- **WHEN** el usuario completa OAuth de Google y vuelve al callback con `invitationId` en cookie HttpOnly
- **THEN** en una transacción se crea/asocia `user`, se crea `member` con `role = "admin"`, y la invitación queda `accepted`

#### Scenario: Aceptación de usuario existente logueado
- **WHEN** un usuario ya logueado clickea "Aceptar invitación" con `invitationId` válido
- **THEN** se crea sólo el `member` (no se duplica el user) y la invitación queda `accepted`

#### Scenario: Aceptación concurrente del mismo `invitationId`
- **WHEN** dos requests intentan aceptar el mismo `invitationId` en paralelo
- **THEN** exactamente una transacción tiene éxito; la otra recibe error de invitación ya aceptada

### Requirement: NO se valida coincidencia de email

El sistema SHALL NOT comparar el email del usuario autenticado (vía formulario o vía Google) contra el `email` de la invitación. El `invitationId` es la única autoridad.

#### Scenario: Aceptación con email distinto al invitado
- **WHEN** la invitación tiene `email = "a@x.com"` y el usuario acepta con cuenta `b@y.com`
- **THEN** la aceptación es exitosa y el `member` queda creado con el `userId` de `b@y.com`

### Requirement: Copiar link de invitación

El detalle de la organización SHALL exponer, por cada invitación, un botón que copie al portapapeles la URL `${origin}/accept-invitation?invitationId={id}` y muestre una notificación de confirmación.

#### Scenario: Click en "Copiar link"
- **WHEN** el super_admin clickea el botón de copiar en una fila de invitación
- **THEN** el portapapeles contiene la URL exacta con el `invitationId` de esa fila y un toast confirma "Link copiado"

### Requirement: Reenviar invitación

El sistema SHALL exponer la server action `resendOrgInvitation({ invitationId })` que SHALL: (a) verificar `requireSuperAdmin`, (b) rechazar si la invitación está `accepted`, expirada, o no existe, (c) re-enviar el email con el mismo link, sin rotar el `invitationId` ni refrescar `expiresAt`.

#### Scenario: Reenvío de invitación pending
- **WHEN** el super_admin reenvía una invitación `pending` no expirada
- **THEN** se dispara el envío del email con la misma URL y se muestra confirmación, sin cambiar valores en BD

#### Scenario: Reenvío de invitación aceptada o expirada
- **WHEN** el super_admin intenta reenviar una invitación `accepted` o con `expiresAt < now`
- **THEN** la action rechaza con error explícito y no envía email

### Requirement: Eliminar invitación pending

El sistema SHALL exponer `deleteOrgInvitation({ invitationId })` que SHALL: (a) verificar `requireSuperAdmin`, (b) eliminar la fila SOLO si `status = "pending"`, (c) rechazar en cualquier otro estado.

#### Scenario: Eliminación de pending
- **WHEN** el super_admin elimina una invitación `pending`
- **THEN** la fila se borra de `invitation` y la UI la quita del tab

#### Scenario: Intento de eliminar aceptada
- **WHEN** el super_admin intenta eliminar una invitación `accepted`
- **THEN** la action rechaza con error "Invitación ya aceptada", sin tocar BD

### Requirement: Email de invitación de admin de org

El sistema SHALL enviar un email al `email` de la invitación con: asunto referenciando el nombre de la organización, copy en español neutral (segunda persona `tú`), link a `${baseUrl}/accept-invitation?invitationId={id}`, y aviso de expiración en 7 días.

#### Scenario: Email contiene link correcto
- **WHEN** se crea una invitación
- **THEN** el email enviado contiene la URL `${baseUrl}/accept-invitation?invitationId={id}` y no usa voseo

### Requirement: Listado por email para la bandeja del invitado

Las invitaciones nativas `invitation` SHALL ser legibles por el propio invitado mediante un filtro `LOWER(invitation.email) = LOWER(session.user.email) AND status = 'pending' AND expiresAt > now()`. Este filtro vive en la capability `account-invitations` y SHALL aplicarse solo al listado de la bandeja del usuario; las reglas de aceptación NO SHALL verse afectadas.

#### Scenario: Bandeja muestra invitaciones del email del usuario
- **WHEN** un usuario autenticado consulta `/account/invitations`
- **THEN** el sistema lista las invitaciones cuyo `invitation.email` (lowercase) coincide con `session.user.email` (lowercase) y están pending no expiradas

#### Scenario: Aceptación NO valida email
- **WHEN** ese mismo usuario sigue el link y acepta la invitación
- **THEN** la aceptación procede según las reglas existentes en esta misma capability, sin comparar emails

### Requirement: Invitaciones de tenant emitidas por admin de organización

Las invitaciones nativas `invitation` con `role ∈ {"admin", "member"}` SHALL poder ser creadas por usuarios con `member.role ∈ {"admin", "owner"}` para esa `organizationId`. El `inviterId` SHALL apuntar al admin que la emite. La capability `account-organizations` define la action; esta capability documenta que el uso de la tabla nativa para este escenario es legítimo y no introduce tablas paralelas.

#### Scenario: Admin de tenant crea invitación member
- **WHEN** un admin de tenant invoca la action de invitación con `role = "member"`
- **THEN** se persiste una fila `invitation` con `inviterId = admin.id`, `role = "member"`, `status = "pending"`, `expiresAt` a 7 días

#### Scenario: Coexistencia con invitaciones del super_admin
- **WHEN** el super_admin crea una invitación admin para la misma org desde `/super/organizations/new` o desde el detalle
- **THEN** ambas filas coexisten en la tabla sin conflictos; el listado de invitaciones de la org las muestra a todas independientemente del `inviterId`

### Requirement: Aceptación de invitación super → admin dispara la creación de la tarea de onboarding

Cuando la aceptación de una invitación emitida por un super_admin se completa exitosamente, el sistema SHALL invocar el flujo de creación de tarea de onboarding descrito en la capability `onboarding-task`. La invocación SHALL ocurrir en la misma transacción atómica que (a) crea o asocia al `user`, (b) crea el `member` con `role = "admin"`, y (c) marca la invitación con `status = "accepted"`.

Si la creación de la tarea falla, la transacción de aceptación SHALL revertir completa, consistente con la regla de atomicidad ya establecida en esta capability.

El `authorId` de la tarea de onboarding SHALL ser el `user.id` del super_admin que originó la invitación (`invitation.inviterId`), y el `responsibleId` SHALL ser el `user.id` del admin invitado.

#### Scenario: Super crea institución, admin acepta y obtiene tarea
- **WHEN** un super_admin crea una institución desde `/super/organizations/new` y el admin invitado acepta la invitación (signup + accept o accept logueado)
- **THEN** al completarse la aceptación existe `member` con `role = "admin"` Y una tarea de onboarding con `authorId = super.id`, `responsibleId = admin.id`, `organizationId` igual al de la institución recién creada, todo en la misma transacción

#### Scenario: Aceptación concurrente sigue siendo atómica
- **WHEN** dos requests intentan aceptar el mismo `invitationId` super → admin en paralelo
- **THEN** exactamente una transacción tiene éxito (con su tarea de onboarding incluida); la otra recibe error de invitación ya aceptada y no crea ninguna tarea

#### Scenario: Falla en la creación de la tarea revierte la aceptación super → admin
- **WHEN** durante el flujo de aceptación super → admin la inserción de la tarea de onboarding falla por error de base
- **THEN** la transacción completa hace rollback: la invitación queda en `pending`, no se inserta `member` y no se crea tarea
