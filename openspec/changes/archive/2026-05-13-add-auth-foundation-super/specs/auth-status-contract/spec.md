## MODIFIED Requirements

### Requirement: Implementación stub en v1 retorna `unauthenticated`

La implementación de `useAuthStatus` SHALL derivar su estado de la sesión real de better-auth a través de `authClient.useSession()`. El mapeo SHALL ser:

- `isPending === true` → `{ status: 'loading' }`
- `data?.user` ausente → `{ status: 'unauthenticated' }`
- `data?.user` presente → `{ status: 'authenticated', dashboardHref: deriveDashboardHref(data) }`

`deriveDashboardHref` SHALL aplicar las reglas: `super_admin → /super`, `member.role === "admin" → /admin`, otro → `/app`.

#### Scenario: Sesión cargando
- **WHEN** `authClient.useSession()` reporta `isPending: true`
- **THEN** el hook retorna `{ status: 'loading' }`

#### Scenario: Sin sesión
- **WHEN** `authClient.useSession()` reporta `data: null`
- **THEN** el hook retorna `{ status: 'unauthenticated' }`

#### Scenario: Sesión activa de super_admin
- **WHEN** `authClient.useSession()` retorna un usuario con `role === "super_admin"`
- **THEN** el hook retorna `{ status: 'authenticated', dashboardHref: '/super' }`

#### Scenario: Sesión activa de admin de tenant
- **WHEN** la sesión incluye un usuario con `role === "user"` y membership activa con `member.role === "admin"`
- **THEN** el hook retorna `{ status: 'authenticated', dashboardHref: '/admin' }`

#### Scenario: Sesión activa de usuario regular
- **WHEN** la sesión incluye un usuario con `role === "user"` sin membership admin
- **THEN** el hook retorna `{ status: 'authenticated', dashboardHref: '/app' }`
