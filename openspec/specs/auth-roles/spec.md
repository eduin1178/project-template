# auth-roles Specification

## Purpose

Modelo de roles: rol global por usuario (`super_admin` / `admin` / `user`) y rol dentro de organización (`admin` / `member`). Define cómo se asignan, cómo se aíslan los super_admin del modelo multi-tenant, y cómo se deriva el destino post-login.

## Requirements

### Requirement: Rol global del usuario

El sistema SHALL definir un rol global por usuario almacenado en `user.role` con tres valores posibles: `super_admin`, `admin`, `user`. El valor por defecto al crear un usuario nuevo SHALL ser `user`. El plugin `admin` de better-auth SHALL estar configurado con `defaultRole: "user"` y la lista de roles incluida.

#### Scenario: Usuario nuevo recibe rol por defecto
- **WHEN** un usuario se registra con email/password o Google sin contexto de invitación
- **THEN** `user.role` se establece a `"user"`

#### Scenario: Aceptación de invitación super establece rol super_admin
- **WHEN** un usuario completa el flujo de aceptación de invitación con un token de invitación válido
- **THEN** `user.role` se establece a `"super_admin"` en la misma transacción donde se crea el usuario

### Requirement: Rol dentro de organización (tenant)

El sistema SHALL usar el plugin `organization` de better-auth para gestionar membership de usuarios a organizaciones (tenants). El rol del miembro dentro de la organización (`member.role`) SHALL ser uno de: `admin` o `member`.

#### Scenario: Plugin organization configurado
- **WHEN** se inspecciona la configuración del servidor better-auth
- **THEN** incluye `organization()` en `plugins` con roles `admin` y `member`

#### Scenario: Schema incluye tablas de organización
- **WHEN** se inspecciona el schema generado
- **THEN** existen las tablas `organization`, `member` e `invitation` del plugin

### Requirement: Super_admin no pertenece a ninguna organización

Un usuario con `user.role === "super_admin"` SHALL NO tener registros en la tabla `member`. Su acceso transversal SHALL derivar exclusivamente de su rol global.

#### Scenario: Super_admin creado sin membership
- **WHEN** se completa el bootstrap de un super_admin o se acepta una invitación super
- **THEN** no se crea ningún registro en `member` para ese usuario

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
