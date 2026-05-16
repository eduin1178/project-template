## MODIFIED Requirements

### Requirement: Cálculo de `dashboardHref` según rol

El sistema SHALL exponer una función `deriveDashboardHref(data)` en `lib/auth/derive-dashboard-href.ts` que devuelve la ruta de destino post-login. El algoritmo SHALL usar el rol del usuario en la **organización activa resuelta** cuando ese dato esté disponible. Cuando NO esté disponible (callers legacy), SHALL caer al algoritmo legacy basado en `user.role` global + `memberships.some(admin|owner)`.

Algoritmo cuando el caller provee `activeOrgRole`:

1. Si `activeOrgRole === null` Y `user.role === "super_admin"` → `/super`
2. Si `activeOrgRole === null` Y `user.role !== "super_admin"` → `/account/organizations`
3. Si `activeOrgRole === "owner"` o `"admin"` → `/admin`
4. Si `activeOrgRole === "member"` → `/app`

Algoritmo legacy (sin `activeOrgRole`):

1. Si `user.role === "super_admin"` → `/super`
2. Si `memberships.some(role ∈ {admin, owner})` → `/admin`
3. En cualquier otro caso → `/app`

#### Scenario: Super sin org activa redirige a /super
- **WHEN** `deriveDashboardHref` recibe `user.role === "super_admin"` y `activeOrgRole === null`
- **THEN** retorna `"/super"`

#### Scenario: Super con membresía admin en org activa redirige a /admin
- **WHEN** `deriveDashboardHref` recibe `user.role === "super_admin"` y `activeOrgRole === "admin"`
- **THEN** retorna `"/admin"` (la capacidad super NO fuerza `/super` si hay contexto de org)

#### Scenario: Super con membresía member en org activa redirige a /app
- **WHEN** `deriveDashboardHref` recibe `user.role === "super_admin"` y `activeOrgRole === "member"`
- **THEN** retorna `"/app"`

#### Scenario: Admin en org activa redirige a /admin
- **WHEN** `deriveDashboardHref` recibe `activeOrgRole === "admin"`
- **THEN** retorna `"/admin"` independientemente del rol global

#### Scenario: Member en org activa redirige a /app aunque sea admin en otra org
- **WHEN** `deriveDashboardHref` recibe `activeOrgRole === "member"` con memberships que incluyen otra org donde el rol es admin
- **THEN** retorna `"/app"` (la decisión depende SOLO de la org activa)

#### Scenario: Caller legacy sin activeOrgRole conserva semántica anterior
- **WHEN** `deriveDashboardHref` recibe `user.role === "user"` con memberships que incluyen `role === "admin"` y SIN `activeOrgRole`
- **THEN** retorna `"/admin"` (preserva el comportamiento previo para callers que no fueron migrados)
