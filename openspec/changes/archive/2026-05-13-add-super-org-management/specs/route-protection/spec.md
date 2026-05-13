## ADDED Requirements

### Requirement: Route group `(public)` dentro de `/super` exento del guard de rol

El sistema SHALL permitir que rutas bajo el route group `app/super/(public)/` se rendericen sin verificación de `user.role === "super_admin"`. La verificación de rol SHALL vivir exclusivamente en `app/super/(protected)/layout.tsx` y no en `app/super/layout.tsx` (raíz del segmento).

#### Scenario: Ruta pública en /super accesible sin sesión
- **WHEN** un visitante sin sesión navega a `/super/accept-invitation?token=...`
- **THEN** la página se renderiza sin invocar `requireSuperAdmin` y sin responder 404

#### Scenario: Guard delegado al sublayout protegido
- **WHEN** se inspecciona `app/super/layout.tsx`
- **THEN** NO invoca `requireSuperAdmin`; sólo provee el shell raíz del segmento

#### Scenario: Layout protegido sigue siendo autoridad
- **WHEN** se inspecciona `app/super/(protected)/layout.tsx`
- **THEN** invoca un guard que verifica rol `super_admin` y llama `notFound()` si no se cumple

## MODIFIED Requirements

### Requirement: Layout RSC es la verdad para render

Cada layout de ruta protegida SHALL invocar `auth.api.getSession({ headers: await headers() })` y verificar el rol requerido. Si la sesión no existe o el rol no coincide, el layout SHALL invocar `notFound()` para `/super` y `redirect("/login")` para `/admin` y `/app`. Dentro de `/super`, esta verificación SHALL vivir en `app/super/(protected)/layout.tsx`, no en `app/super/layout.tsx`, para permitir rutas públicas hermanas bajo `app/super/(public)/`.

#### Scenario: /super sin sesión devuelve 404
- **WHEN** se hace request directa a una ruta `/super/(protected)/*` con cookie inválida o ausente y proxy no la intercepta
- **THEN** el sublayout `(protected)` invoca `notFound()` y responde 404

#### Scenario: /super con sesión pero rol incorrecto devuelve 404
- **WHEN** un usuario autenticado con `user.role !== "super_admin"` navega a `/super/organizations`
- **THEN** el sublayout `(protected)` invoca `notFound()` y responde 404

#### Scenario: /admin sin rol de admin redirige a /login
- **WHEN** un usuario autenticado sin `member.role === "admin"` navega a `/admin`
- **THEN** el layout RSC invoca `redirect("/login")` (o redirige al `dashboardHref` derivado de su rol)

### Requirement: Archivo `proxy.ts` (no `middleware.ts`)

El sistema SHALL crear `next-app/proxy.ts` siguiendo la convención de Next.js 16. El archivo SHALL exportar la función `proxy` (no `middleware`) y un `config` con `matcher` explícito que cubra rutas protegidas (`/super/:path*`, `/admin/:path*`, `/app/:path*`, `/login`) y excluya assets estáticos y API auth (`/api/auth/:path*`). El matcher SHALL incluir `/super/:path*` aunque incluya rutas públicas como `/super/accept-invitation`; el proxy NO redirige rutas públicas porque no requieren cookie de sesión.

#### Scenario: Convención Next 16 respetada
- **WHEN** se inspecciona la raíz de `next-app`
- **THEN** existe `proxy.ts` (no `middleware.ts`) que exporta `proxy` como función nombrada o default y exporta `config` con `matcher`

#### Scenario: Matcher excluye assets
- **WHEN** Next.js sirve `/_next/static/*` o `/_next/image/*`
- **THEN** `proxy` NO se ejecuta para esas rutas

#### Scenario: Ruta pública dentro de /super no redirige
- **WHEN** un visitante sin cookie navega a `/super/accept-invitation?token=...`
- **THEN** el proxy NO redirige a `/login` (la ruta está en una allowlist o el proxy reconoce el segmento `(public)` por path)
