## MODIFIED Requirements

### Requirement: Bootstrap del primer super_admin

El flujo `/super/setup` SHALL crear el primer `super_admin` y, en la misma transacción de base de datos, SHALL invocar `ensurePlatformMembership(newUser.id, tx)` para garantizar que el nuevo super pertenece a la org plataforma con `role="owner"` y `status="active"`.

Tras commit, el flujo SHALL:

1. Setear `user.lastActiveOrganizationId = <orgPlataforma.id>` para el nuevo super
2. Invocar `auth.api.setActiveOrganization({ body: { organizationId: <orgPlataforma.id> } })` para que la sesión recién creada arranque apuntando a la plataforma
3. Redirigir explícitamente a `/super` (no a `/post-login`), porque el setup tiene foco explícito en gestión de plataforma

`/super/setup` SHALL responder 404 una vez que existe al menos un `super_admin` en la base, igual que antes.

#### Scenario: Setup crea super + membership en una transacción
- **WHEN** un agente completa el formulario de `/super/setup` con el token correcto
- **THEN** al terminar la transacción existen: (a) `user` con `role="super_admin"`, (b) `member` para ese user en la org plataforma con `role="owner"`, (c) `user.lastActiveOrganizationId === platformOrg.id`

#### Scenario: Setup redirige a /super
- **WHEN** el setup completa exitosamente
- **THEN** la respuesta redirige a `/super`, no a `/post-login` ni a `/admin`

#### Scenario: Setup idempotente ante reintento parcial
- **WHEN** el setup se reintenta tras una falla parcial (super creado, membership no)
- **THEN** una segunda llamada a `ensurePlatformMembership` repara el estado sin duplicar filas
