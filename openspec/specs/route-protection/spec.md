# route-protection Specification

## Purpose

Protección de rutas con defense-in-depth: `proxy.ts` (Next 16) para UX rápido basado en presencia de cookie, layouts RSC como autoridad real para render, y guards en server actions para autoridad en mutaciones.

## Requirements

### Requirement: Archivo `proxy.ts` (no `middleware.ts`)

El sistema SHALL mantener `next-app/proxy.ts` siguiendo la convención de Next.js 16. El archivo SHALL exportar la función `proxy` (no `middleware`) y un `config` con `matcher` explícito.

El `matcher` SHALL cubrir, además de las rutas existentes (`/super/:path*`, `/login`):

- Rutas dinámicas de workspace `/:slug` y `/:slug/:path*`, excluyendo por allowlist los segmentos reservados (`super`, `account`, `api`, `login`, `signup`, `forgot-password`, `reset-password`, `verify-email`, `check-email`, `accept-invitation`, `post-login`, `_next` y assets).
- Rutas legacy `/app/:path*` y `/admin/:path*` para emitir redirect a `/post-login`.

El `matcher` SHALL excluir explícitamente:

- `/_next/*` (assets del bundler).
- `/api/*` (rutas de API).
- Carpetas estáticas en `/public` como `/images/*`, `/fonts/*`, `/assets/*`.
- Cualquier path cuyo último segmento tenga extensión de archivo (`.*\.[a-zA-Z0-9]+$`).

#### Scenario: Matcher cubre slug dinámico
- **WHEN** un usuario sin cookie navega a `/<slug>/tasks`
- **THEN** el proxy intercepta y redirige a `/login?next=/<slug>/tasks`

#### Scenario: Matcher excluye rutas reservadas
- **WHEN** un usuario navega a `/account/profile`
- **THEN** el proxy NO trata `/account` como slug; no aplica redirect de workspace

#### Scenario: Matcher excluye assets estáticos
- **WHEN** Next.js sirve `/images/logo.png`, `/_next/static/*` o `/_next/image/*`
- **THEN** `proxy` NO se ejecuta para esas rutas (el optimizador de imágenes funciona sin redirects intermedios)

#### Scenario: Ruta pública dentro de /super no redirige
- **WHEN** un visitante sin cookie navega a `/super/accept-invitation?token=...`
- **THEN** el proxy NO redirige a `/login` (la ruta está en una allowlist o el proxy reconoce el segmento `(public)` por path)

### Requirement: Proxy solo para UX (no autoridad)

`proxy.ts` SHALL únicamente realizar redirects rápidos basados en la presencia o ausencia de la cookie de sesión:

- Sin cookie de sesión accediendo a `/<slug>/*`, `/super/*` → redirect a `/login?next={path}`
- Con cookie de sesión accediendo a `/login` → redirect a `/post-login` (la verdadera resolución del rol y slug se hace en el server)
- URLs legacy `/app`, `/app/*`, `/admin`, `/admin/*` → redirect a `/post-login`

`proxy.ts` SHALL NOT consultar la BD ni verificar autorización por rol. Es solo UX.

#### Scenario: Sin cookie redirige a /login
- **WHEN** una request sin cookie de sesión llega a `/super`
- **THEN** la respuesta es 302 hacia `/login?next=/super`

#### Scenario: Con cookie en /login redirige a /post-login
- **WHEN** una request con cookie de sesión llega a `/login`
- **THEN** la respuesta es 302 hacia `/post-login` (donde el server component resuelve el destino real con slug)

### Requirement: Redirects de URLs legacy

`proxy.ts` SHALL emitir `redirect` desde URLs legacy al endpoint resolver:

- `/app` y `/app/*` → `/post-login`
- `/admin` y `/admin/*` → `/post-login`

El endpoint `/post-login` resuelve el slug correcto vía `redirectToDashboard()` y completa la navegación. Si preservar deep-link al taskId era deseable, queda como follow-up; este change acepta perder `/app/tasks/123` deep-link en favor de simplicidad.

#### Scenario: /app redirige a /post-login
- **WHEN** un usuario con cookie de sesión navega a `/app`
- **THEN** el proxy redirige a `/post-login`

#### Scenario: /admin/tasks/<id> redirige a /post-login
- **WHEN** un usuario con cookie navega a `/admin/tasks/abc123`
- **THEN** el proxy redirige a `/post-login` (el taskId no se preserva por ahora)

### Requirement: Layout RSC del workspace es la verdad para render

Cada layout de ruta protegida SHALL invocar `auth.api.getSession({ headers: await headers() })` y aplicar el guard correspondiente:

- `app/[slug]/layout.tsx`: si no hay sesión → `redirect("/login?next=/${slug}")`. Si la org del slug no existe o el usuario no es miembro activo → `notFound()` (NO redirect; no se expone existencia).
- `app/[slug]/admin/layout.tsx`: si rol-en-org-del-slug NO es admin/owner → `redirect("/${slug}")`.
- `app/super/(protected)/layout.tsx`: si `user.role !== "super_admin"` → `notFound()`.

El layout NO consulta `session.activeOrganizationId` como fuente de autoridad; el slug de la URL es autoridad. Si difieren, el layout sincroniza la sesión al slug.

#### Scenario: /[slug] sin sesión redirige a /login con next
- **WHEN** un request sin cookie llega a `/<slug>`
- **THEN** redirect a `/login?next=/<slug>`

#### Scenario: /[slug] de org inexistente devuelve 404
- **WHEN** un usuario autenticado navega a `/slug-que-no-existe`
- **THEN** `notFound()` se invoca (404)

#### Scenario: /[slug] de org existente sin membresía devuelve 404
- **WHEN** un usuario autenticado sin membresía activa en la org navega a `/<slug>`
- **THEN** `notFound()` se invoca (404). NO se hace `redirect`; no se expone existencia de la org

#### Scenario: /[slug]/admin de un member redirige a /[slug]
- **WHEN** un member intenta `/<slug>/admin`
- **THEN** redirect a `/<slug>` (donde sí puede entrar)

#### Scenario: /super con sesión pero rol incorrecto devuelve 404
- **WHEN** un usuario autenticado con `user.role !== "super_admin"` navega a `/super/organizations`
- **THEN** el sublayout `(protected)` invoca `notFound()` y responde 404

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

### Requirement: Server actions verifican autoridad

Cada server action que mute estado o exponga datos sensibles SHALL llamar a un helper que verifique sesión + rol antes de proceder. El sistema SHALL exponer al menos los helpers:

- `requireSession()` — retorna sesión o lanza
- `requireSuperAdmin()` — retorna sesión + assert rol `super_admin` o lanza
- `requireTenantAdmin()` — retorna sesión + asserts membership admin o lanza
- `requireAnyUser()` — retorna sesión o lanza
- `requireWorkspaceMemberBySlug(slug)` — valida que el usuario es miembro activo de la org identificada por slug; retorna `{ userId, orgId, slug, role }`

Estos helpers SHALL residir en `lib/auth/guards.ts`.

#### Scenario: Server action de invitación protegida
- **WHEN** una server action `createSuperInvitation` se invoca
- **THEN** su primera línea invoca `requireSuperAdmin()`; si falla, la action lanza sin continuar

#### Scenario: Refactor que mueve action a otra ruta no rompe seguridad
- **WHEN** una server action se mueve de `app/super/page.tsx` a otra ruta protegida
- **THEN** sigue protegida porque la verificación vive dentro de la action, no en el matcher del proxy

### Requirement: Server actions reciben contexto explícito

Toda nueva server action del workspace SHALL recibir `organizationId` o `organizationSlug` como argumento explícito y NO leer `session.activeOrganizationId` para sus operaciones. La razón es multi-tab: el slug de la URL es autoridad; la sesión es cache que puede flipear entre tabs.

Esta regla SHALL documentarse en `next-app/AGENTS.md`. La migración de las server actions existentes a este patrón es follow-up y NO bloquea el archive de este change.

#### Scenario: Convención documentada
- **WHEN** se inspecciona `next-app/AGENTS.md`
- **THEN** existe una sección que indica que server actions del workspace reciben `organizationSlug` o `organizationId` como argumento explícito
