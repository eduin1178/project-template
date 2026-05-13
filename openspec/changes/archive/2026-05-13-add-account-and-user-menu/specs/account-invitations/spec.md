## ADDED Requirements

### Requirement: Ruta `/account/invitations` con bandeja del usuario

El sistema SHALL exponer `app/account/invitations/page.tsx` accesible para cualquier usuario autenticado. La página SHALL listar invitaciones cuyo `invitation.email` coincida (case-insensitive) con `session.user.email`, con `status = "pending"` y `expiresAt > now()`.

#### Scenario: Usuario con invitaciones pending
- **WHEN** un usuario autenticado con N invitaciones pending no expiradas a su email navega a `/account/invitations`
- **THEN** la página lista N filas con `organizationName`, `organization.logo`, `role` invitado (admin/member), `invitedAt`, `expiresAt`, y CTA "Ver invitación"

#### Scenario: Empty state
- **WHEN** un usuario sin invitaciones pending navega a la ruta
- **THEN** se renderiza `EmptyState` con título "No tienes invitaciones pendientes" y copy explicativo

#### Scenario: Email case-insensitive
- **WHEN** la `invitation.email` está en mayúsculas y `session.user.email` en minúsculas (o viceversa)
- **THEN** la comparación se hace en lowercase y la fila aparece igualmente

#### Scenario: Invitaciones expiradas no aparecen
- **WHEN** existe una invitación con `expiresAt < now()` para el email del usuario
- **THEN** no se muestra en la bandeja

#### Scenario: Invitaciones aceptadas o rechazadas no aparecen
- **WHEN** existe una invitación con `status` distinto a `pending` para el email del usuario
- **THEN** no se muestra en la bandeja

### Requirement: CTA "Ver invitación" enlaza a la ruta pública de aceptación

Cada fila SHALL incluir un enlace a `/accept-invitation?invitationId={id}`. El sistema NO SHALL aceptar la invitación directamente desde la bandeja: el usuario debe pasar por la ruta pública de aceptación (que ya existe) para confirmar la operación.

#### Scenario: Click en "Ver invitación"
- **WHEN** un usuario clickea el CTA de una fila
- **THEN** navega a `/accept-invitation?invitationId={id}`, que renderiza el flujo de aceptación existente con botón "Aceptar invitación" si ya está logueado

### Requirement: NO se valida coincidencia de email en aceptación

La existencia del listado filtrado por email SHALL NOT cambiar la regla establecida en `super-org-invitations`: la aceptación en `/accept-invitation` sigue siendo autoritativa por `invitationId` y NO compara el email del invitado contra el de la sesión.

#### Scenario: Usuario acepta invitación de otro email
- **WHEN** un usuario autenticado abre el link de aceptación de una invitación cuyo `email` no es el suyo
- **THEN** la aceptación procede igual; el `member` queda asociado al `userId` autenticado, no al email invitado
