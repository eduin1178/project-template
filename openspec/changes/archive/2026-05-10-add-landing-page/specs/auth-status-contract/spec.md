## ADDED Requirements

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

En v1, la implementación de `useAuthStatus` SHALL retornar siempre `{ status: 'unauthenticated' }` de forma síncrona, sin realizar llamadas de red ni leer cookies.

#### Scenario: Llamada al hook en v1
- **WHEN** un componente cliente invoca `useAuthStatus()`
- **THEN** recibe `{ status: 'unauthenticated' }` sin efectos secundarios

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
