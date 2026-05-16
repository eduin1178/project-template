## MODIFIED Requirements

### Requirement: Archivo `proxy.ts` (no `middleware.ts`)

El sistema SHALL mantener `next-app/proxy.ts` siguiendo la convención de Next.js 16. El archivo SHALL exportar la función `proxy` (no `middleware`) y un `config` con `matcher` explícito.

El `matcher` SHALL cubrir, además de las rutas existentes (`/super/:path*`, `/login`):

- Rutas dinámicas de workspace `/:slug` y `/:slug/:path*`, excluyendo por allowlist los segmentos reservados (`super`, `account`, `api`, `login`, `signup`, `forgot-password`, `reset-password`, `verify-email`, `check-email`, `accept-invitation`, `post-login`, `_next` y assets).
- Rutas legacy `/app/:path*` y `/admin/:path*` para emitir redirect a `/post-login`.

El `matcher` SHALL excluir explícitamente `/_next/*` y `/favicon.ico`.

#### Scenario: Matcher cubre slug dinámico
- **WHEN** un usuario sin cookie navega a `/<slug>/tasks`
- **THEN** el proxy intercepta y redirige a `/login?next=/<slug>/tasks`

#### Scenario: Matcher excluye rutas reservadas
- **WHEN** un usuario navega a `/account/profile`
- **THEN** el proxy NO trata `/account` como slug; no aplica redirect de workspace

### Requirement: Redirects de URLs legacy

`proxy.ts` SHALL emitir `redirect` permanente o temporal desde URLs legacy al endpoint resolver:

- `/app` y `/app/*` → `/post-login`
- `/admin` y `/admin/*` → `/post-login`

El endpoint `/post-login` resuelve el slug correcto vía `redirectToDashboard()` y completa la navegación. Si el dev preserva deep-link al taskId era deseable, queda como follow-up; este change acepta perder `/app/tasks/123` deep-link en favor de simplicidad.

#### Scenario: /app redirige a /post-login
- **WHEN** un usuario con cookie de sesión navega a `/app`
- **THEN** el proxy redirige a `/post-login` con status 307

#### Scenario: /admin/tasks/<id> redirige a /post-login
- **WHEN** un usuario con cookie navega a `/admin/tasks/abc123`
- **THEN** el proxy redirige a `/post-login` (el taskId no se preserva por ahora)

### Requirement: Layout RSC del workspace es la verdad para render

Cada layout de ruta protegida SHALL invocar `auth.api.getSession({ headers: await headers() })` y aplicar el guard correspondiente:

- `app/[slug]/layout.tsx`: si no hay sesión → `redirect("/login?next=/${slug}")`. Si la org del slug no existe o el usuario no es miembro activo → `notFound()` (NO redirect).
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

### Requirement: Server actions reciben contexto explícito

Toda nueva server action del workspace SHALL recibir `organizationId` o `organizationSlug` como argumento explícito y NO leer `session.activeOrganizationId` para sus operaciones. La razón es multi-tab: el slug de la URL es autoridad; la sesión es cache.

Esta regla SHALL documentarse en `next-app/AGENTS.md`. La migración de las server actions existentes a este patrón es follow-up y NO bloquea el archive de este change.

#### Scenario: Convención documentada
- **WHEN** se inspecciona `next-app/AGENTS.md`
- **THEN** existe una sección que indica que server actions del workspace reciben `organizationSlug` o `organizationId` como argumento explícito
