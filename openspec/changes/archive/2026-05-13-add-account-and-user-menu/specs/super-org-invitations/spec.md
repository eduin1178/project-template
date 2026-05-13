## ADDED Requirements

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
