## REMOVED Requirements

### Requirement: Super_admin no pertenece a ninguna organización

**Reason**: El modelo nuevo requiere que todo super_admin sea miembro `owner` de la organización plataforma. La regla previa (sin membresía) es incompatible con el patrón de la industria (Vercel/Linear/Notion) y producía bloqueos cuando un super era invitado a una org real.

**Migration**: el script `db:seed-platform` enrola a todos los super_admins existentes en la org plataforma de forma idempotente. Tras el seed, esta regla queda invertida (ver ADDED en spec `platform-organization`).

## MODIFIED Requirements

### Requirement: Cálculo de `dashboardHref` según rol

El sistema SHALL exponer una función `deriveDashboardHref(data)` en `lib/auth/derive-dashboard-href.ts` que devuelve la ruta de destino post-login. El algoritmo SHALL usar el rol del usuario en la **organización activa resuelta** cuando ese dato esté disponible. La capacidad `user.role === "super_admin"` SHALL NO forzar `/super` como destino: un super con membresía activa entra al workspace de esa org como cualquier otro usuario; `/super` se accede explícitamente vía el ítem "Panel de plataforma" del sidebar.

Algoritmo cuando el caller provee `activeOrgRole`:

1. Si `activeOrgRole === "owner"` o `"admin"` → `/admin`
2. Si `activeOrgRole === "member"` → `/app`
3. Si `activeOrgRole === null` Y `user.role === "super_admin"` → `/super` (defensa en profundidad — no debería ocurrir tras el seed)
4. Si `activeOrgRole === null` Y `user.role !== "super_admin"` → `/account/organizations`

Algoritmo legacy (sin `activeOrgRole`, callers no migrados):

1. Si `user.role === "super_admin"` → `/super`
2. Si `memberships.some(role ∈ {admin, owner})` → `/admin`
3. En cualquier otro caso → `/app`

#### Scenario: Super con membresía admin en org plataforma redirige a /admin
- **WHEN** `deriveDashboardHref` recibe `user.role === "super_admin"` y `activeOrgRole === "owner"` (la org plataforma)
- **THEN** retorna `"/admin"` (NO `/super`)

#### Scenario: Super accede a /super solo vía sidebar
- **WHEN** un super hace login y resuelve activeOrg = org plataforma
- **THEN** el dashboard inicial es `/admin` y `/super` se accede vía clic en "Panel de plataforma" del sidebar

#### Scenario: Defensa en profundidad para super sin membresía
- **WHEN** un bug deja a un super_admin sin membresía y llega a `deriveDashboardHref` con `activeOrgRole === null`
- **THEN** retorna `"/super"` (no rompe, pero se registra como error de invariante en logs)

### Requirement: Rol global del usuario

El sistema SHALL definir un rol global por usuario almacenado en `user.role` con valores `super_admin` o `user`. El valor por defecto al crear un usuario nuevo SHALL ser `user`.

El rol `super_admin` SHALL tratarse como **capacidad**: única consecuencia funcional es habilitar acceso al panel `/super`. NO determina el destino de redirect, NO bloquea la pertenencia a organizaciones, NO modifica el shell del workspace excepto agregando el ítem "Panel de plataforma" al sidebar.

#### Scenario: Usuario nuevo recibe rol por defecto
- **WHEN** un usuario se registra con email/password o Google sin contexto de invitación super
- **THEN** `user.role` se establece a `"user"`

#### Scenario: Aceptación de invitación super establece rol y membership
- **WHEN** un usuario completa el flujo de aceptación con un token de invitación super válido
- **THEN** `user.role` se establece a `"super_admin"` Y se crea membership owner en la org plataforma en la misma transacción

#### Scenario: super_admin es una capacidad, no un modo
- **WHEN** un super navega a `/admin` o `/app` con membresía en la org activa
- **THEN** la página renderiza normalmente sin redirect a `/super`
