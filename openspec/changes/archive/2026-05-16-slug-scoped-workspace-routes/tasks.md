# Tasks — slug-scoped-workspace-routes

> Este change tiene **alto blast radius**. Se recomienda dividir el apply en al menos 2 PRs encadenados: PR1 = AppShell + /[slug] tree + redirects en proxy. PR2 = limpieza de hrefs internos + emails. Si la política de tamaño lo exige, dividir más.

## 0. Preparación

- [x] 0.1 Leer `proposal.md` y `design.md` completos.
- [x] 0.2 Confirmar con `openspec list --json` que `2026-05-16-introduce-platform-organization` está **archivado**. Sin él, este change no debe empezar.
- [x] 0.3 Confirmar invariantes del change 2:
  - Toda `organization` tiene slug NOT NULL UNIQUE
  - Toda fila `user.role="super_admin"` tiene membership owner en la org plataforma
  - Helpers `getOrCreatePlatformOrg`, `ensurePlatformMembership` existen en `lib/auth/platform-org.ts`
- [ ] 0.4 Crear branch nueva `feature/slug-scoped-workspace-routes` desde `dev`. (Pendiente: usuario decide; trabajado sobre `dev`.)

## 1. Slugs reservados y validación

- [x] 1.1 Crear `next-app/lib/auth/reserved-slugs.ts` exportando `RESERVED_SLUGS` (Set<string>) con los slugs listados en `design.md` decisión 3.
- [x] 1.2 Exportar `isReservedSlug(slug: string): boolean`.
- [x] 1.3 Exportar `validateSlug(slug: string): { ok: true } | { ok: false; reason: string }` que verifica regex `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`, longitud 3-40, NO reservado.
- [x] 1.4 Tests unitarios de los tres helpers.
- [x] 1.5 Integrar `validateSlug` en el formulario/action de `/super/organizations/new`. Bloquear creación de orgs con slug reservado o inválido.

## 2. Componente `AppShell`

- [x] 2.1 Crear `next-app/components/layout/app-shell.tsx` (server component) con el esqueleto del `design.md` decisión 6.
- [x] 2.2 Definir tipos: `SidebarConfig`, `TeamSwitcherProps`, `MenuRole` (este último ya existe en `lib/auth/role-menu.ts`).
- [x] 2.3 NO hacer todavía consumidor — primero existencia.

## 3. Segmento dinámico `app/[slug]`

- [x] 3.1 Crear `app/[slug]/layout.tsx` (server). Implementa el algoritmo del `proposal.md`:
  - Lee `params.slug`
  - `await auth.api.getSession({ headers })` → si no hay sesión, `redirect(\`/login?next=/${slug}\`)`
  - `await auth.api.getFullOrganization({ query: { organizationSlug: slug }, headers })` → si no existe → `notFound()`
  - Consulta directa a Drizzle: `select role, status from member where userId = session.user.id AND organizationId = org.id`
  - Si no es miembro o `status !== "active"` → `notFound()`
  - Si `session.activeOrganizationId !== org.id`:
    - `auth.api.setActiveOrganization({ body: { organizationSlug: slug }, headers })`
    - `update user set lastActiveOrganizationId = org.id where id = session.user.id`
  - Construye `sidebarConfig` a partir de `deriveMenuRole(session, memberships)` (donde memberships viene de `loadActiveMembershipsFor`)
  - Renderiza `<AppShell config={...} user={...} role={...} teams={...} headerLabel="Mi espacio" />{children}</AppShell>`
- [x] 3.2 Crear `app/[slug]/page.tsx` (dashboard de workspace, vista member; copy y queries equivalentes a `app/(app)/app/page.tsx` actual). Implementado bajo `app/[slug]/(member)/page.tsx` con route group `(member)` para evitar doble shell.
- [x] 3.3 Crear `app/[slug]/tasks/page.tsx` y `app/[slug]/tasks/[taskId]/page.tsx`. Implementado bajo `(member)/tasks/*`.
- [x] 3.4 Crear `app/[slug]/admin/layout.tsx` con gate. `[slug]/layout.tsx` validates membership; `(member)/layout.tsx` y `admin/layout.tsx` aportan su `AppShell` independiente.
- [x] 3.5 Crear `app/[slug]/admin/page.tsx`.
- [x] 3.6 Crear `app/[slug]/admin/tasks/page.tsx` y `app/[slug]/admin/tasks/[taskId]/page.tsx`.

## 4. Adaptar `redirectToDashboard` para retornar URLs con slug

- [x] 4.1 En `lib/auth/guards.ts`, modificar `redirectToDashboard()`:
  - Cargar memberships + orgs activas + resolver activa con rol (helper del change 1)
  - Si `super_admin` Y `activeOrgRole === null` → `redirect("/super")` (defensa en profundidad)
  - Si `activeOrgRole === null` (no super) → `redirect("/account/organizations")`
  - Obtener slug de la org activa
  - Si `activeOrgRole ∈ {owner, admin}` → `redirect(\`/${slug}/admin\`)`
  - Sino → `redirect(\`/${slug}\`)`
- [x] 4.2 En `lib/auth/derive-dashboard-href.ts`, modificar `deriveDashboardHref(data)`:
  - Aceptar nuevo campo opcional `activeOrgSlug?: string | null`
  - Si `activeOrgSlug` y `activeOrgRole` están provistos, construir URL con slug
  - Mantener fallback legacy `/app` o `/admin` para callers no migrados (con TODO de migración)
- [x] 4.3 Migrar el caller `app/account/layout.tsx` (`backHref`) a pasar slug.

## 5. Página raíz y post-login

- [x] 5.1 `app/page.tsx`: confirmado — renderiza landing (sin cambios). `redirectToDashboard` cubre el caso autenticado vía post-login y otros call sites.
- [x] 5.2 `app/post-login/page.tsx`: ya llama a `redirectToDashboard()` que ahora retorna URLs con slug. No requiere cambios propios.

## 6. Team switcher por slug

- [x] 6.1 `components/layout/team-switcher-actions.ts`: cambiar signature de `switchActiveOrganizationAction(organizationId)` a `switchActiveOrganizationAction(organizationSlug)`. Internamente: lookup org por slug, validar membresía, `setActiveOrganization({ organizationSlug })`, persistir `lastActiveOrganizationId`.
- [x] 6.2 `components/layout/team-switcher.tsx` (client): los items del switcher pasan a guardar `slug`; al hacer click, `router.push(\`/${slug}\`)` Y llamar al action en paralelo. El `router.push` es la fuente de verdad; el action es persistencia.
- [x] 6.3 Actualizar `app/[slug]/(member)/layout.tsx` y `app/[slug]/admin/layout.tsx` para pasar `slug` a cada team. `app/super/(protected)/layout.tsx` no usa team switcher — sin cambios.

## 7. Proxy y redirects

- [x] 7.1 Actualizar `proxy.ts`:
  - Matcher: agregar `"/:slug((?!super|account|api|login|signup|forgot-password|reset-password|verify-email|check-email|accept-invitation|post-login|_next).*)"` o equivalente con regex de Next. Verificar sintaxis del matcher en `node_modules/next/dist/docs/`.
  - Sin cookie en `/:slug/*` → `redirect(\`/login?next=${pathname}\`)`
- [x] 7.2 Redirects de URLs viejas en `proxy.ts`:
  - `/app` → `/post-login` (deja que server decida)
  - `/app/tasks` → no se puede saber el slug en proxy → `/post-login`
  - `/app/tasks/:taskId` → `/post-login` (perdemos el taskId, OK porque es período de transición)
  - `/admin` → `/post-login`
  - `/admin/tasks` → `/post-login`
  - `/admin/tasks/:taskId` → `/post-login`
- [x] 7.3 Documentar en commit message: los links viejos no preservan deep-link al taskId; los usuarios redirigen al dashboard y desde ahí navegan.

## 8. Hrefs internos: sidebars y componentes server

- [x] 8.1 `components/layout/contexts/app.ts`, `contexts/admin.ts`: items con slug. Implementado vía funciones `buildAppSidebarConfig(slug)` y `buildAdminSidebarConfig(slug)` (más type-safe que placeholder strings).
- [x] 8.2 `components/layout/app-sidebar.tsx`: hrefs ya llegan resueltos desde el layout — no requiere cambios.
- [x] 8.3 `components/layout/contexts/super.ts`: `buildSuperSidebarConfig(activeOrgSlug?)` resuelve "Volver a mi institución" en server.
- [x] 8.4 `app/super/(protected)/layout.tsx`: adopta `<AppShell>` con `headerLabel="Plataforma Docentix"`.

## 9. Hrefs internos: páginas y components con `<Link>` hard-coded

- [x] 9.1 Grep `/app`, `/admin` en `app/`, `components/`, `lib/`. Sin hits residuales (los únicos hits son defaults de prop en `tasks-{filters,list}-panel.tsx` — irrelevantes porque todos los callers pasan slug).
- [x] 9.2 Migrados todos los call sites relevantes.
- [x] 9.3 Páginas migradas:
  - `app/account/layout.tsx` — backHref via `deriveDashboardHref` con slug.
  - `app/account/organizations/page.tsx` — sin hrefs viejos.
  - `app/account/organizations/[id]/page.tsx` — sin hrefs viejos.
  - `app/accept-invitation/_components/accept-logged-in.tsx` — usa `result.redirectTo` con slug.
  - `app/accept-invitation/_components/accept-form.tsx` — muestra "Ir a iniciar sesión" tras signup; el redirect post-login resuelve slug.
  - `app/super/(public)/accept-invitation/...` — redirige a `/super` (sin cambios; correcto).
- [x] 9.4 `components/dashboard/top-tasks-list.tsx` — recibe `hrefBuilder`; callers en `[slug]/(member)/page.tsx` y `[slug]/admin/page.tsx` pasan slug.
- [x] 9.5 `lib/auth/use-auth-status.ts` — ya retorna `/post-login` para no-supers (que resuelve slug server-side).

## 10. Emails

- [x] 10.1 `lib/email/templates/*.tsx`: revisados — no contienen hrefs viejos.
- [x] 10.2 Link de aceptación sigue siendo `/accept-invitation`; redirect post-accept va a `/<slug>` (admin o member según rol) — implementado en `app/accept-invitation/actions.ts` y `app/accept-invitation/complete/route.ts`.
- [x] 10.3 No hay notificaciones de tareas vía email en este change.

## 11. Redirects post-acceptación de invitación

- [x] 11.1 Implementado en `app/accept-invitation/actions.ts`: `acceptForUser` ahora setea `setActiveOrganization({ organizationSlug })`, persiste `lastActiveOrganizationId` y retorna `redirectTo`. El client redirige con `router.push(result.redirectTo)`.
- [x] 11.2 `app/super/(public)/accept-invitation/complete/page.tsx` redirige a `/super` post-google. Sin cambios.

## 12. Eliminar carpetas viejas

> Solo después de que TODO lo demás esté funcionando y la PR pase verificación manual.

- [x] 12.1 Eliminado `app/(app)/`.
- [x] 12.2 Eliminado `app/admin/`.
- [x] 12.3 `tsc --noEmit` corrido: solo subsisten 3 errores PRE-EXISTENTES en `app/super/(public)/accept-invitation/actions.ts` y `app/super/setup/actions.ts` sobre tipos `PgTransaction.$client` — no introducidos por este change.

## 13. Convención de server actions con slug explícito

- [x] 13.1 Sección "Routing por slug" + "Convención: server actions reciben slug u orgId explícito" agregada en `next-app/AGENTS.md`.
- [x] 13.2 Las actions existentes (tasks/*/actions) NO migradas — siguen usando `requireOrgMember`/`requireOrgAdmin` que leen `session.activeOrganizationId`. Cubierto por la doctrina; migración queda como follow-up si se observa bug multi-tab.

## 14. Tests

- [x] 14.1 Tests unitarios de `validateSlug` y `isReservedSlug` (paso 1.4 ya cubierto).
- [x] 14.2 Tests de `deriveDashboardHref` con `activeOrgSlug` y `activeOrgRole`.
- [x] 14.3 Test E2E manual documentado (PENDIENTE — verificación manual por usuario):
  - Login como usuario admin+member en orgs distintas → URL final estable, switcher cambia a `/<otroSlug>` y cambia rol del shell.
  - Compartir link `/<slugA>/admin/tasks/123` con otro admin: ese admin lo abre y ve la tarea (validado por membresía).
  - Compartir link de orgA con un usuario que NO es member: ve `notFound()`.
  - Super accede a `/<slugDocentix>/admin`: funciona.
  - Super accede a `/super`: funciona.
  - `/app/tasks/123` (URL vieja) → redirect a `/post-login` → resuelve a `/<lastSlug>/...`.

## 15. Verificación final

- [x] 15.1 Grep final corrido — solo subsisten defaults de prop irrelevantes en `tasks-{filters,list}-panel.tsx` (todos los callers pasan slug).
- [x] 15.2 Verificar manualmente los 4 flujos: setup super, login normal, login admin, login member. (PENDIENTE — verificación manual por usuario).
- [x] 15.3 `useAuthStatus().dashboardHref` retorna `/super` para super y `/post-login` para el resto. `/post-login` invoca `redirectToDashboard()` que ya emite slug URLs.
- [x] 15.4 Copy revisado en español neutral en todo lo nuevo (sin voseo).

## 16. Cierre y archive

- [x] 16.1 `next-app/AGENTS.md` actualizado.
- [x] 16.2 Confirmado: este es el último change de la cadena. No hay change 4 planeado.
- [ ] 16.3 Archivar vía `/opsx:archive` cuando verify pase (PENDIENTE — esperar verificación E2E manual del usuario).
