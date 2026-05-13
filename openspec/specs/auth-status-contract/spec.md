# auth-status-contract Specification

## Purpose

Contrato cliente `useAuthStatus()` que expone el estado de autenticación al UI mediante una union discriminada estable. La landing y futuras vistas dependen de este contrato; en v1 retorna siempre `unauthenticated` (stub) y se conecta a la fuente real cuando exista la spec de autenticación, sin tocar consumidores.

## Requirements


### Requirement: Hook `useAuthStatus` con contrato estable

El proyecto SHALL exponer un hook cliente `useAuthStatus()` desde `lib/auth/use-auth-status.ts` que retorne un objeto discriminado por el campo `status` con la siguiente forma:

```ts
type AuthStatus =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; dashboardHref: string };
```

Este contrato SHALL permanecer estable cuando se integre el sistema real de autenticación en una spec futura; los consumidores SHALL NO requerir cambios.

#### Scenario: Tipo exportado
- **WHEN** se inspecciona el módulo `lib/auth/use-auth-status.ts`
- **THEN** exporta el tipo `AuthStatus` (o equivalente) y el hook `useAuthStatus` con la firma `() => AuthStatus`

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

### Requirement: Hook marcado como cliente

El módulo que define `useAuthStatus` SHALL declarar la directiva `"use client"` y NO SHALL ser importado desde Server Components directamente; solo a través de componentes cliente que lo consumen.

#### Scenario: Directiva "use client" presente
- **WHEN** se inspecciona la primera línea del archivo del hook
- **THEN** contiene exactamente `"use client";`

### Requirement: Consumo desde Server Component vía componente cliente

Cualquier sección renderizada como Server Component que necesite reaccionar al estado de autenticación SHALL hacerlo importando un componente cliente intermedio (por ejemplo `<AuthCta />`) que internamente llame al hook, en lugar de invocar el hook desde el RSC.

#### Scenario: Navbar (RSC) usa AuthCta (client)
- **WHEN** se inspecciona el componente `Navbar` de la landing
- **THEN** es un Server Component que renderiza `<AuthCta />` (componente cliente) sin importar directamente `useAuthStatus`
