# auth-roles Specification

## Purpose

Modelo de roles: rol global por usuario (`super_admin` / `admin` / `user`) y rol dentro de organización (`admin` / `member`). Define cómo se asignan, cómo se aíslan los super_admin del modelo multi-tenant, y cómo se deriva el destino post-login.

## Requirements

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

### Requirement: Rol dentro de organización (tenant)

El sistema SHALL usar el plugin `organization` de better-auth para gestionar membership de usuarios a organizaciones (tenants). El rol del miembro dentro de la organización (`member.role`) SHALL ser uno de: `admin` o `member`.

#### Scenario: Plugin organization configurado
- **WHEN** se inspecciona la configuración del servidor better-auth
- **THEN** incluye `organization()` en `plugins` con roles `admin` y `member`

#### Scenario: Schema incluye tablas de organización
- **WHEN** se inspecciona el schema generado
- **THEN** existen las tablas `organization`, `member` e `invitation` del plugin

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

#### Scenario: Admin en org activa redirige a /admin
- **WHEN** `deriveDashboardHref` recibe `activeOrgRole === "admin"`
- **THEN** retorna `"/admin"` independientemente del rol global

#### Scenario: Member en org activa redirige a /app aunque sea admin en otra org
- **WHEN** `deriveDashboardHref` recibe `activeOrgRole === "member"` con memberships que incluyen otra org donde el rol es admin
- **THEN** retorna `"/app"` (la decisión depende SOLO de la org activa)

#### Scenario: Caller legacy sin activeOrgRole conserva semántica anterior
- **WHEN** `deriveDashboardHref` recibe `user.role === "user"` con memberships que incluyen `role === "admin"` y SIN `activeOrgRole`
- **THEN** retorna `"/admin"` (preserva el comportamiento previo para callers que no fueron migrados)
