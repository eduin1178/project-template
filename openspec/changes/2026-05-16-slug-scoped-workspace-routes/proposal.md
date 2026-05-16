## Chain context

Este change es **el tercero y final de una cadena de tres** que rediseña el modelo de autenticación y layout de Docentix.

| # | Change | Estado al cerrar |
|---|--------|------------------|
| 1 | `2026-05-16-fix-auth-redirect-loops` | Bugs de redirect parchados sobre el modelo viejo. |
| 2 | `2026-05-16-introduce-platform-organization` | `super_admin` es `owner` de la org plataforma (`slug = "docentix"`). `/super` es panel de staff. Reset de migraciones. |
| **3 (este)** | `2026-05-16-slug-scoped-workspace-routes` | Rutas `/app/*` y `/admin/*` migran a `/[slug]/*` y `/[slug]/admin/*`. Slug en URL es source of truth del contexto activo. Shell unificado en componente `AppShell`. |

**Prerequisite**: change 2 archivado. Sin él, no existe la garantía de que todo super tenga membresía, lo que rompe varios flujos de este change.

**Codebase assumptions at start** (post-change-2):
- Toda fila de `organization` tiene `slug` no-nulo y único.
- Toda fila de `user` con `role="super_admin"` tiene `member` en la org plataforma con `role="owner"`.
- `redirectToDashboard()` en `lib/auth/guards.ts` decide por rol-en-org-activa.
- Layouts `/(app)/layout.tsx` y `/admin/layout.tsx` NO redirigen super a `/super`.
- `/super/(protected)/layout.tsx` muestra "Plataforma Docentix" o equivalente.
- Sidebars de workspace muestran ítem "Panel de plataforma" para supers.
- `team-switcher-actions.ts` recibe `organizationId` (id, no slug).
- `proxy.ts` cubre matchers `/super/:path*`, `/admin/:path*`, `/app/:path*`, `/login`.

**Para retomar en una sesión nueva**: leé este `proposal.md`, luego `design.md`, luego `tasks.md`. Verificá con `openspec list --json` el estado del change. Si el change está parcialmente aplicado, revisá `apply-progress` en engram (topic_key `sdd/slug-scoped-workspace-routes/apply-progress`) o el último commit de la rama.

**Después de este change**: el modelo queda en su forma final estándar de industria. No hay change 4 planeado. Si en el futuro se quiere mover a subdominios (`<slug>.docentix.com`), eso es un change independiente.

---

## Why

Los changes 1 y 2 arreglaron los bugs y limpiaron el modelo de roles, pero **dejaron intacta una asimetría central**: el contexto del usuario (qué org está usando) vive **en la sesión**, no en la URL. Esto produce:

1. **Links no compartibles**: `/admin/tasks/123` significa cosas distintas según `session.activeOrganizationId`. Mandar el link a un compañero le muestra la tarea de SU org, no la tuya.
2. **Tabs no aisladas**: si tenés dos tabs abiertas en orgs distintas, la última que hagas switch gana para ambas. Cualquier acción en la tab "vieja" usa la org "nueva" sin avisar.
3. **`/admin` y `/app` son URLs hermanas con la misma semántica de "el panel de mi org actual"**, lo cual es redundante. La industria fusiona ambas bajo `/<slug>` (el rol-en-org-activa decide qué se muestra adentro), o separa explícitamente `/<slug>` (workspace member) y `/<slug>/admin` (sección admin).
4. **Tres layouts duplicados** (`/(app)`, `/admin`, `/super`) que comparten 90% del código y solo difieren en `config` del sidebar. La duplicación es deuda visible cada vez que se modifica el shell.

Vercel, Linear, Notion, Slack, GitHub-orgs todos modelan el workspace con **slug en URL**. El patrón funciona porque:

- El slug es self-documenting: leer la URL te dice en qué workspace estás.
- Deep-linking funciona out-of-the-box.
- Switch de org = navegación (`router.push("/<otroslug>")`), no mutación de sesión.
- La sesión queda como cache de "última org visitada", no como autoridad.

Este change adopta ese patrón. Es el más invasivo de la cadena: cambia URLs, archivos, redirects, hrefs de menú, plantillas de email y proxy. Es el último change planeado precisamente porque hasta acá la app no estaba en producción y porque los changes 1 y 2 prepararon el terreno conceptualmente.

## What Changes

### Estructura de rutas

- **Crear segmento dinámico `app/[slug]/`** que aloja el workspace de una org específica. Bajo este segmento:
  - `app/[slug]/page.tsx` — dashboard de la org (vista member o admin según `member.role` del usuario en esa org).
  - `app/[slug]/tasks/page.tsx`, `app/[slug]/tasks/[taskId]/page.tsx` — tareas (la vista que ve un member sin todos los controles admin).
  - `app/[slug]/admin/page.tsx`, `app/[slug]/admin/tasks/page.tsx`, `app/[slug]/admin/tasks/[taskId]/page.tsx` — sección admin (gate por `member.role ∈ {admin, owner}` en la org del slug).
  - `app/[slug]/layout.tsx` — único shell del workspace; valida slug ∈ memberships activas del usuario, resuelve rol-en-org y sincroniza `setActiveOrganization` por slug.

- **Eliminar segmentos `app/(app)/` y `app/admin/`**. El contenido se redistribuye bajo `app/[slug]/`. Los archivos antiguos se borran; el contenido equivalente se mueve.

- **Mantener `app/super/`**, `app/account/`, `app/(auth)/`, `app/accept-invitation/` sin cambios estructurales (siguen siendo rutas globales no scoped a slug).

### Shell unificado

- **Crear componente `components/layout/app-shell.tsx`** que encapsula `TooltipProvider`, `SidebarProvider`, `AppSidebar`, `SidebarInset`, header con `SidebarTrigger` y `ThemeToggle`, y `Toaster`. Recibe `sidebarConfig`, `user`, `role`, `teams` (opcional), `headerLabel` y `children` como props.
- **Refactorizar `app/[slug]/layout.tsx`** para consumir `AppShell` con la config derivada de `deriveMenuRole(session, memberships)`.
- **Refactorizar `app/super/(protected)/layout.tsx`** para consumir `AppShell` con `superSidebarConfig` y `role="super_admin"`.
- **Eliminar duplicación** de imports y render de sidebar entre los layouts.

### Routing y guards

- **`app/[slug]/layout.tsx`** SHALL:
  1. Leer `params.slug`.
  2. `getCurrentSession()` → si no hay sesión, `redirect("/login?next=/{slug}")`.
  3. `getFullOrganization({ organizationSlug: slug })` via better-auth. Si no existe → `notFound()`.
  4. Verificar `member.userId === session.user.id && member.organizationId === org.id && member.status === "active"`. Si no es miembro → `notFound()` (NO `redirect`, para evitar leak de existencia).
  5. Si `session.activeOrganizationId !== org.id`, llamar `auth.api.setActiveOrganization({ body: { organizationSlug: slug } })` para sincronizar y persistir `user.lastActiveOrganizationId = org.id`.
  6. Renderizar `<AppShell>` con `sidebarConfig` derivada del rol del usuario en la org del slug.

- **`app/[slug]/admin/layout.tsx` (opcional, pero recomendado)** SHALL gatear acceso a la sección admin:
  - Si rol-en-org-del-slug NO es `admin` u `owner` → `redirect("/{slug}")` (la home del workspace, que sí puede ver).

- **`app/page.tsx` (raíz)** SHALL redirigir a `/<lastSlug>` si hay sesión, o a `/login` si no. `lastSlug` se obtiene de `user.lastActiveOrganizationId` → lookup en `organization`.

- **`app/post-login/page.tsx`** SHALL adaptar `redirectToDashboard()` para devolver `/<slug>` o `/<slug>/admin` según rol-en-org-activa, en vez de `/app` o `/admin`. Sin contexto de org, sigue cayendo a `/super` (super sin orgs, defensa en profundidad) o `/account/organizations`.

### Switcher de org por slug

- **Refactorizar `components/layout/team-switcher-actions.ts`** para que `switchActiveOrganizationAction` acepte `organizationSlug: string` en vez de `organizationId`. El switcher en el cliente SHALL hacer `router.push(\`/${slug}\`)` además de invocar el action (la navegación es la fuente de verdad; el action solo persiste el cache).
- **Actualizar el componente `TeamSwitcher`** para construir hrefs con slug y para llamar al action con slug.

### Proxy y redirects de URLs viejas

- **Actualizar `proxy.ts`**:
  - El matcher SHALL cubrir `/:slug` y `/:slug/:path*` además de las rutas existentes. Excluir rutas reservadas (`/super`, `/account`, `/api`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/check-email`, `/accept-invitation`, `/post-login`, assets) por allowlist.
  - Sin cookie de sesión accediendo a `/:slug/*` → `redirect("/login?next=/:slug/*")`.
  - Con cookie en `/login` → `/post-login`.
- **Redirects permanentes para URLs viejas** en `proxy.ts` o en una página específica:
  - `/app` → `/<lastSlug>` o `/post-login` si no hay slug en cookie.
  - `/app/tasks` → `/<lastSlug>/tasks`.
  - `/app/tasks/:taskId` → `/<lastSlug>/tasks/:taskId`.
  - `/admin` → `/<lastSlug>/admin`.
  - `/admin/tasks` → `/<lastSlug>/admin/tasks`.
  - `/admin/tasks/:taskId` → `/<lastSlug>/admin/tasks/:taskId`.
- Si en algún caso `lastSlug` no es resoluble por cookie de sesión, redirect a `/post-login` que decide qué hacer.

### Hrefs internos

- **Buscar todos los `href="/admin"`, `href="/app"`, `href="/admin/..."`, `href="/app/..."`, `href="/tasks/..."`** en el código y reemplazarlos por hrefs construidos con `slug`. Para componentes server, recibir `slug` como prop. Para componentes client, leer del `useParams()`.
- **Emails de invitación**: tras aceptar, el redirect post-acceptation SHALL ir a `/<orgSlug>` (no a `/app`).
- **Menús del sidebar**: `appSidebarConfig`, `adminSidebarConfig` se reescriben para que sus items tengan hrefs relativos al slug actual. Una alternativa es seguir teniendo hrefs absolutos templated (`{slug}` placeholder) y resolverlos en el render del `AppSidebar`.

### Slug y rename

- Por simplicidad, **el slug es inmutable**. Si el equipo necesita renombrar una institución, se renombra el `name` pero no el `slug`. Esto evita la necesidad de tabla de aliases y `permanentRedirect`. Documentar en `next-app/AGENTS.md` como decisión de producto.
- La validación de slug al crear org (en `/super/organizations/new` o equivalente) SHALL forzar kebab-case (`^[a-z0-9]+(?:-[a-z0-9]+)*$`), longitud 3–40, no reservado (lista: `super`, `account`, `api`, `login`, `signup`, etc.).

## Capabilities

### New Capabilities

- `workspace-routing`: Define cómo `/[slug]` modela el contexto activo, cómo se valida, cómo se sincroniza con la sesión, cómo se reservan slugs y cómo se gatea la sección `/[slug]/admin`.
- `app-shell`: Define el componente `AppShell` reusable y sus responsabilidades. Documenta props, dependencias y consumidores.

### Modified Capabilities

- `route-protection`: El proxy y los layouts se adaptan al nuevo segmento `[slug]`. Las reglas defense-in-depth siguen vigentes pero las rutas matcheadas cambian.
- `account-organizations`: Los hrefs hacia el workspace de una org ahora usan slug.
- `tasks-core` / `org-dashboard`: Las páginas se mueven a `/[slug]/tasks/*` y `/[slug]/admin/*`. La lógica de queries no cambia (ya recibe `orgId`).
- `account-invitations` / `super-org-invitations` / `onboarding-task`: El redirect post-aceptación usa slug. Los emails enlazan a `/<slug>`.
- `super-panel`: El ítem "Volver a mi institución" pasa a navegar a `/<slug>` directo (no a `/post-login`) cuando el super tiene un slug activo persistido.
- `landing-page`: El CTA "Ir a tu panel" pasa a calcular `/<slug>` o `/<slug>/admin` desde el rol-en-org-activa.
- `auth-status-contract`: `useAuthStatus().dashboardHref` pasa a producir URLs con slug.

### Out of scope

- NO subdominios por org.
- NO renombre de slugs (slug inmutable por decisión).
- NO i18n del shell.
- NO refactor de las páginas de cuenta (`/account/*`).
- NO cambios funcionales a `/super`. Solo `/super/(protected)/layout.tsx` adopta `AppShell`.

## Impact

### Código

**Archivos nuevos**:
- `next-app/app/[slug]/layout.tsx`
- `next-app/app/[slug]/page.tsx` (dashboard de workspace; member o admin según rol)
- `next-app/app/[slug]/tasks/page.tsx`, `next-app/app/[slug]/tasks/[taskId]/page.tsx`
- `next-app/app/[slug]/admin/layout.tsx` (gate de sección admin)
- `next-app/app/[slug]/admin/page.tsx`, `next-app/app/[slug]/admin/tasks/page.tsx`, `next-app/app/[slug]/admin/tasks/[taskId]/page.tsx`
- `next-app/components/layout/app-shell.tsx` (componente unificado)
- `next-app/lib/auth/reserved-slugs.ts` (lista de slugs prohibidos)

**Archivos eliminados**:
- `next-app/app/(app)/layout.tsx`, `next-app/app/(app)/app/page.tsx`, `next-app/app/(app)/tasks/page.tsx`, `next-app/app/(app)/tasks/[taskId]/page.tsx`
- `next-app/app/admin/layout.tsx`, `next-app/app/admin/page.tsx`, `next-app/app/admin/tasks/page.tsx`, `next-app/app/admin/tasks/[taskId]/page.tsx`

**Archivos modificados**:
- `next-app/app/page.tsx` (raíz redirige a `/<lastSlug>` o `/login`)
- `next-app/app/post-login/page.tsx` y `lib/auth/guards.ts` (`redirectToDashboard` retorna slug URLs)
- `next-app/lib/auth/derive-dashboard-href.ts` (consume slug)
- `next-app/proxy.ts` (matchers nuevos + redirects de URLs viejas)
- `next-app/components/layout/team-switcher-actions.ts` (recibe slug)
- `next-app/components/layout/team-switcher.tsx` (usa slug, hace `router.push`)
- `next-app/components/layout/contexts/app.ts`, `contexts/admin.ts`, `contexts/super.ts` (items con placeholder `{slug}`)
- `next-app/components/layout/app-sidebar.tsx` (resuelve `{slug}` en render)
- `next-app/app/super/(protected)/layout.tsx` (adopta `AppShell`)
- `next-app/lib/auth/use-auth-status.ts` (`dashboardHref` con slug)
- `next-app/lib/email/templates/*.tsx` (links a `/<slug>` post-aceptación, donde corresponda)
- `next-app/app/account/layout.tsx` (botón "Volver al panel" calcula slug)
- `next-app/app/accept-invitation/_components/*` y `app/super/(public)/accept-invitation/_components/*` (redirect post-accept a `/<slug>`)

**Tests**:
- Tests unitarios de validación de slug (`reserved-slugs.ts`).
- Tests E2E (manuales documentados) de los redirects de URLs viejas y de la navegación entre `/<slug>` y `/<slug>/admin`.

### Datos

- Sin cambios al schema.
- Pre-requisito (cumplido por change 2): toda org tiene slug populated.

### Riesgo

- **Alto blast radius**: cambian URLs, redirects, hrefs en muchos lugares. Es alta probabilidad de olvidar un href interno.
- Mitigación: lista exhaustiva en tasks; grep final por `/app` y `/admin` para verificar que no quedan hrefs viejos.
- Mitigación 2: redirects de URLs viejas en `proxy.ts` durante 1 release como red de seguridad.
- Las cookies de sesión existentes apuntan a `activeOrganizationId`; el nuevo layout las respeta o las re-sincroniza por slug. Cero log-out forzado.

### Hand-off

Este es el último change de la cadena. Tras archivarlo, el modelo queda estabilizado. Cualquier feature posterior debe asumir:
- Workspace = `/[slug]/...`
- Capacidad super = solo control de acceso a `/super`
- Toda org tiene slug inmutable

Specs principales que reflejan el modelo final: `workspace-routing`, `app-shell`, `auth-roles`, `platform-organization`, `route-protection`.
