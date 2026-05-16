# Tasks — slug-scoped-workspace-routes

> Este change tiene **alto blast radius**. Se recomienda dividir el apply en al menos 2 PRs encadenados: PR1 = AppShell + /[slug] tree + redirects en proxy. PR2 = limpieza de hrefs internos + emails. Si la política de tamaño lo exige, dividir más.

## 0. Preparación

- [ ] 0.1 Leer `proposal.md` y `design.md` completos.
- [ ] 0.2 Confirmar con `openspec list --json` que `2026-05-16-introduce-platform-organization` está **archivado**. Sin él, este change no debe empezar.
- [ ] 0.3 Confirmar invariantes del change 2:
  - Toda `organization` tiene slug NOT NULL UNIQUE
  - Toda fila `user.role="super_admin"` tiene membership owner en la org plataforma
  - Helpers `getOrCreatePlatformOrg`, `ensurePlatformMembership` existen en `lib/auth/platform-org.ts`
- [ ] 0.4 Crear branch nueva `feature/slug-scoped-workspace-routes` desde `dev`.

## 1. Slugs reservados y validación

- [ ] 1.1 Crear `next-app/lib/auth/reserved-slugs.ts` exportando `RESERVED_SLUGS` (Set<string>) con los slugs listados en `design.md` decisión 3.
- [ ] 1.2 Exportar `isReservedSlug(slug: string): boolean`.
- [ ] 1.3 Exportar `validateSlug(slug: string): { ok: true } | { ok: false; reason: string }` que verifica regex `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`, longitud 3-40, NO reservado.
- [ ] 1.4 Tests unitarios de los tres helpers.
- [ ] 1.5 Integrar `validateSlug` en el formulario/action de `/super/organizations/new`. Bloquear creación de orgs con slug reservado o inválido.

## 2. Componente `AppShell`

- [ ] 2.1 Crear `next-app/components/layout/app-shell.tsx` (server component) con el esqueleto del `design.md` decisión 6.
- [ ] 2.2 Definir tipos: `SidebarConfig`, `TeamSwitcherProps`, `MenuRole` (este último ya existe en `lib/auth/role-menu.ts`).
- [ ] 2.3 NO hacer todavía consumidor — primero existencia.

## 3. Segmento dinámico `app/[slug]`

- [ ] 3.1 Crear `app/[slug]/layout.tsx` (server). Implementa el algoritmo del `proposal.md`:
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
- [ ] 3.2 Crear `app/[slug]/page.tsx` (dashboard de workspace, vista member; copy y queries equivalentes a `app/(app)/app/page.tsx` actual)
- [ ] 3.3 Crear `app/[slug]/tasks/page.tsx` y `app/[slug]/tasks/[taskId]/page.tsx` (member-side tasks, equivalente a `app/(app)/tasks/*` actual)
- [ ] 3.4 Crear `app/[slug]/admin/layout.tsx` con gate: consulta rol del usuario en la org del slug; si no es admin/owner, `redirect(\`/${slug}\`)`. Si pasa, renderiza `<AppShell config={adminConfig} headerLabel="Panel admin" />{children}</AppShell>`.
- [ ] 3.5 Crear `app/[slug]/admin/page.tsx` (admin dashboard, equivalente a `app/admin/page.tsx`)
- [ ] 3.6 Crear `app/[slug]/admin/tasks/page.tsx` y `app/[slug]/admin/tasks/[taskId]/page.tsx` (equivalente a `app/admin/tasks/*`)

## 4. Adaptar `redirectToDashboard` para retornar URLs con slug

- [ ] 4.1 En `lib/auth/guards.ts`, modificar `redirectToDashboard()`:
  - Cargar memberships + orgs activas + resolver activa con rol (helper del change 1)
  - Si `super_admin` Y `activeOrgRole === null` → `redirect("/super")` (defensa en profundidad)
  - Si `activeOrgRole === null` (no super) → `redirect("/account/organizations")`
  - Obtener slug de la org activa
  - Si `activeOrgRole ∈ {owner, admin}` → `redirect(\`/${slug}/admin\`)`
  - Sino → `redirect(\`/${slug}\`)`
- [ ] 4.2 En `lib/auth/derive-dashboard-href.ts`, modificar `deriveDashboardHref(data)`:
  - Aceptar nuevo campo opcional `activeOrgSlug?: string | null`
  - Si `activeOrgSlug` y `activeOrgRole` están provistos, construir URL con slug
  - Mantener fallback legacy `/app` o `/admin` para callers no migrados (con TODO de migración)
- [ ] 4.3 Migrar el caller `app/account/layout.tsx` (`backHref`) a pasar slug. El layout `account` puede consultar el slug de la org activa.

## 5. Página raíz y post-login

- [ ] 5.1 `app/page.tsx`: si hay sesión, llamar `redirectToDashboard()`. Si no, redirect a `/login` (o renderizar landing si así está hoy — confirmar lectura del archivo actual).
- [ ] 5.2 `app/post-login/page.tsx`: ya llama a `redirectToDashboard()` que ahora retorna URLs con slug. No requiere cambios propios.

## 6. Team switcher por slug

- [ ] 6.1 `components/layout/team-switcher-actions.ts`: cambiar signature de `switchActiveOrganizationAction(organizationId)` a `switchActiveOrganizationAction(organizationSlug)`. Internamente: lookup org por slug, validar membresía, `setActiveOrganization({ organizationSlug })`, persistir `lastActiveOrganizationId`.
- [ ] 6.2 `components/layout/team-switcher.tsx` (client): los items del switcher pasan a guardar `slug`; al hacer click, `router.push(\`/${slug}\`)` Y llamar al action en paralelo (await ambos). El `router.push` es la fuente de verdad; el action es persistencia.
- [ ] 6.3 Actualizar `app/[slug]/layout.tsx` y `app/super/(protected)/layout.tsx` para pasar `slug` a cada team en lugar de (o además de) `id`.

## 7. Proxy y redirects

- [ ] 7.1 Actualizar `proxy.ts`:
  - Matcher: agregar `"/:slug((?!super|account|api|login|signup|forgot-password|reset-password|verify-email|check-email|accept-invitation|post-login|_next).*)"` o equivalente con regex de Next. Verificar sintaxis del matcher en `node_modules/next/dist/docs/`.
  - Sin cookie en `/:slug/*` → `redirect(\`/login?next=${pathname}\`)`
- [ ] 7.2 Redirects de URLs viejas en `proxy.ts`:
  - `/app` → `/post-login` (deja que server decida)
  - `/app/tasks` → no se puede saber el slug en proxy → `/post-login`
  - `/app/tasks/:taskId` → `/post-login` (perdemos el taskId, OK porque es período de transición)
  - `/admin` → `/post-login`
  - `/admin/tasks` → `/post-login`
  - `/admin/tasks/:taskId` → `/post-login`
- [ ] 7.3 Documentar en commit message: los links viejos no preservan deep-link al taskId; los usuarios redirigen al dashboard y desde ahí navegan.

## 8. Hrefs internos: sidebars y componentes server

- [ ] 8.1 `components/layout/contexts/app.ts`, `contexts/admin.ts`: actualizar items para usar placeholder `{slug}` en hrefs.
  - Ejemplo: `{ href: "/app/tasks", label: "Mis tareas" }` → `{ href: "/{slug}/tasks", label: "Mis tareas" }`
- [ ] 8.2 `components/layout/app-sidebar.tsx`: al renderizar, reemplazar `{slug}` por el slug recibido como prop. Pasar `slug` desde el layout.
- [ ] 8.3 `components/layout/contexts/super.ts`: el ítem "Volver a mi institución" pasa a tener `href = "/<slugDeActiveOrg>"` resuelto en el server cuando se construye la config. Si no hay slug resoluble, fallback a `/post-login`.
- [ ] 8.4 `app/super/(protected)/layout.tsx`: adoptar `<AppShell>` con `headerLabel="Plataforma Docentix"` (o el copy decidido en change 2). Pasar `slug` resuelto para construir el item "Volver".

## 9. Hrefs internos: páginas y components con `<Link>` hard-coded

- [ ] 9.1 Grep `href="/app"`, `href="/admin"`, `href="/app/"`, `href="/admin/"`, `href="/tasks"` en `app/**` y `components/**`.
- [ ] 9.2 Para cada uno: si el componente conoce el slug (vía props o `useParams()`), reemplazar con `/<slug>/...`. Si no, refactor mínimo para recibir slug.
- [ ] 9.3 Páginas a revisar específicamente:
  - `app/account/layout.tsx` (botón "Volver al panel")
  - `app/account/organizations/page.tsx` (links a workspace)
  - `app/account/organizations/[id]/page.tsx`
  - `app/accept-invitation/_components/accept-form.tsx` y `accept-logged-in.tsx`
  - `app/super/(public)/accept-invitation/_components/accept-form.tsx`
  - `app/admin/tasks/[taskId]/page.tsx` (ahora movido a `app/[slug]/admin/tasks/[taskId]`)
- [ ] 9.4 Componentes con hrefs en dashboard:
  - `components/dashboard/top-tasks-list.tsx` (recibe `hrefBuilder` — confirmar callers actualizados)
- [ ] 9.5 `lib/auth/use-auth-status.ts`: `dashboardHref` debe construirse con slug. Si el hook corre client-side y necesita slug, el server le pasa `activeOrgSlug` en la prop inicial.

## 10. Emails

- [ ] 10.1 `lib/email/templates/*.tsx`: revisar plantillas con links a `/app`, `/admin` o equivalentes.
- [ ] 10.2 Para invitaciones a org: link de aceptación NO cambia (sigue siendo `/accept-invitation`). Tras aceptar, redirect a `/<slug>`.
- [ ] 10.3 Para notificaciones de tareas (si existen): link a `/<slug>/admin/tasks/<id>` o `/<slug>/tasks/<id>` según rol del receptor.

## 11. Redirects post-acceptación de invitación

- [ ] 11.1 `app/accept-invitation/_components/accept-form.tsx` y `accept-logged-in.tsx`: tras aceptar, hacer `setActiveOrganization({ organizationSlug })` Y redirect a `/<slug>`.
- [ ] 11.2 `app/super/(public)/accept-invitation/...`: tras crear el super, el flujo del change 2 ya hace `setActiveOrganization` a la org plataforma. El redirect final pasa a `/super` (decidido en change 2).

## 12. Eliminar carpetas viejas

> Solo después de que TODO lo demás esté funcionando y la PR pase verificación manual.

- [ ] 12.1 Eliminar `app/(app)/` completo.
- [ ] 12.2 Eliminar `app/admin/` completo.
- [ ] 12.3 Verificar que `pnpm build` (NO ejecutar build automático, según AGENTS.md — pedir confirmación al user) no rompe. Sino: que `tsc --noEmit` no rompe.

## 13. Convención de server actions con slug explícito

- [ ] 13.1 Agregar sección "Server actions del workspace reciben slug" en `next-app/AGENTS.md`. Resumen:
  - Toda nueva server action que opere sobre datos de una org SHALL recibir `organizationSlug` o `organizationId` como primer argumento, NO leer `session.activeOrganizationId` directamente.
  - Migración de actions existentes es opcional en este change; las críticas pueden migrarse en el apply, el resto queda como follow-up.
- [ ] 13.2 No migrar todas las actions existentes en este change. Solo las que tocan el shell unificado.

## 14. Tests

- [ ] 14.1 Tests unitarios de `validateSlug` y `isReservedSlug` (paso 1.4 ya cubierto).
- [ ] 14.2 Tests de `deriveDashboardHref` con `activeOrgSlug` y `activeOrgRole`.
- [ ] 14.3 Test E2E manual documentado:
  - Login como usuario admin+member en orgs distintas → URL final estable, switcher cambia a `/<otroSlug>` y cambia rol del shell.
  - Compartir link `/<slugA>/admin/tasks/123` con otro admin: ese admin lo abre y ve la tarea (validado por membresía).
  - Compartir link de orgA con un usuario que NO es member: ve `notFound()`.
  - Super accede a `/<slugDocentix>/admin`: funciona.
  - Super accede a `/super`: funciona.
  - `/app/tasks/123` (URL vieja) → redirect a `/post-login` → resuelve a `/<lastSlug>/...`.

## 15. Verificación final

- [ ] 15.1 Grep final `\"/admin\"`, `\"/app\"` en `app/`, `components/`, `lib/` para confirmar que no quedan hrefs viejos hardcoded.
- [ ] 15.2 Verificar manualmente los 4 flujos: setup super, login normal, login admin, login member.
- [ ] 15.3 Verificar `useAuthStatus().dashboardHref` produce slug URL en al menos un consumer (probable: landing o nav público).
- [ ] 15.4 Confirmar copy en español neutral en todo lo nuevo (sin voseo).

## 16. Cierre y archive

- [ ] 16.1 Actualizar `next-app/AGENTS.md` con la convención de slug-scoped routing.
- [ ] 16.2 Confirmar que no hay change pendiente posterior planeado (este es el último).
- [ ] 16.3 Archivar el change vía `/opsx:archive` cuando verify pase.
