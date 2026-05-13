## ADDED Requirements

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

El sistema SHALL exponer una función `deriveDashboardHref(session)` en `lib/auth/derive-dashboard-href.ts` que devuelve la ruta de destino post-login según el siguiente algoritmo:

1. Si `user.role === "super_admin"` → `/super`
2. Si existe membership activa con `member.role === "admin"` → `/admin`
3. En cualquier otro caso → `/app`

#### Scenario: Super_admin redirige a /super
- **WHEN** `deriveDashboardHref` recibe una sesión con `user.role === "super_admin"`
- **THEN** retorna `"/super"` sin consultar memberships

#### Scenario: Admin de tenant redirige a /admin
- **WHEN** `deriveDashboardHref` recibe una sesión con `user.role === "user"` y una membership con `member.role === "admin"`
- **THEN** retorna `"/admin"`

#### Scenario: Usuario regular redirige a /app
- **WHEN** `deriveDashboardHref` recibe una sesión con `user.role === "user"` y sin memberships o solo con `member.role === "member"`
- **THEN** retorna `"/app"`
