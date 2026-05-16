# Tasks — introduce-platform-organization

## 0. Preparación

- [ ] 0.1 Leer `proposal.md` y `design.md` completos
- [ ] 0.2 Confirmar con `openspec list --json` que el change 1 (`2026-05-16-fix-auth-redirect-loops`) está archivado o que el equipo decidió saltearlo
- [ ] 0.3 Confirmar con el equipo que **se va a borrar la base de datos local de dev** y todos los devs deben re-seedearla tras este merge
- [ ] 0.4 Hacer commit/push de cualquier dato de dev valioso antes de empezar
- [ ] 0.5 Documentar en `next-app/AGENTS.md` que existe un script `pnpm run db:seed-platform` y cuándo correrlo

## 1. Módulo de org plataforma

- [ ] 1.1 Crear `next-app/lib/auth/platform-org.ts` con `import "server-only"` y constantes exportadas:
  ```ts
  export const PLATFORM_ORG_SLUG = "docentix";
  export const PLATFORM_ORG_NAME = "Docentix";
  ```
- [ ] 1.2 Exportar helper `getOrCreatePlatformOrg(executor?: DbOrTx)` que: hace SELECT por slug; si no existe, INSERT con id generado (cuid o similar, ver convención existente); retorna `{ id, slug, name }`
- [ ] 1.3 Exportar helper `ensurePlatformMembership(userId: string, executor?: DbOrTx)` que: garantiza org plataforma existe; intenta INSERT en `member` con `role="owner"`, `status="active"`, `organizationId=<orgPlataforma.id>`; usa `ON CONFLICT DO NOTHING` sobre `(organizationId, userId)`; retorna `{ organizationId, role: "owner" }`
- [ ] 1.4 Ambos helpers aceptan un executor opcional (db o tx) para componer dentro de transacciones de otros flujos

## 2. Reset de migraciones

- [ ] 2.1 Inspeccionar `next-app/lib/db/migrations/` y anotar la última migración aplicada en `meta/_journal.json`
- [ ] 2.2 Borrar todos los archivos `*.sql` y la carpeta `meta/` en `next-app/lib/db/migrations/`
- [ ] 2.3 Correr `pnpm drizzle-kit generate` (o el comando configurado) para regenerar `0000_init.sql` desde el schema actual
- [ ] 2.4 Verificar que el snapshot generado contiene todas las tablas del schema actual (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`, `task`, `task_*`, etc.)
- [ ] 2.5 Revisar `0000_init.sql` y confirmar que `organization.slug` es `NOT NULL UNIQUE`
- [ ] 2.6 Aplicar la migración contra una DB recién booteada: `docker compose down -v && docker compose up -d && pnpm db:migrate`

## 3. Seed de la org plataforma

- [ ] 3.1 Crear script `next-app/lib/db/seed-platform.ts` que:
  - Llama a `getOrCreatePlatformOrg()` para asegurar la org
  - Selecciona todos los `user` con `role = "super_admin"`
  - Para cada super, llama a `ensurePlatformMembership(user.id)`
  - Setea `user.lastActiveOrganizationId = platformOrg.id` para esos supers
  - Imprime resumen por consola: `[seed-platform] org=<id> nuevos miembros=<n>`
- [ ] 3.2 Agregar comando en `next-app/package.json`: `"db:seed-platform": "tsx lib/db/seed-platform.ts"` (o el runner que use el proyecto)
- [ ] 3.3 Documentar el comando en `next-app/AGENTS.md`

## 4. Hook en `/super/setup`

- [ ] 4.1 Localizar la action que crea el primer super (probable: `app/super/setup/setup-form.tsx` action o un módulo en `lib/auth/actions.ts`)
- [ ] 4.2 Tras crear el `user` con `role="super_admin"`, dentro de la misma transacción:
  - Llamar `ensurePlatformMembership(user.id, tx)`
  - Setear `user.lastActiveOrganizationId = platformOrgId`
- [ ] 4.3 Después del commit, llamar `auth.api.setActiveOrganization({ body: { organizationId: platformOrgId }, headers: await headers() })`
- [ ] 4.4 Validar que el redirect post-setup ya no va forzosamente a `/super`; ahora respeta `redirectToDashboard()` (que con `activeOrgRole = "owner"` debería ir a `/admin` — confirmar que es lo deseado, o forzar `/super` explícitamente porque el super recién creado quiere ver el panel)
- [ ] 4.5 Decisión registrada en este task: tras `/super/setup` la app SHALL redirigir a `/super` directamente, no a `/admin`. Justificación: el flujo de setup es para gestionar la plataforma, no para usar Docentix como tenant.

## 5. Hook en aceptación de invitación super

- [ ] 5.1 Localizar action de aceptación en `app/super/(public)/accept-invitation/_components/accept-form.tsx` o equivalente
- [ ] 5.2 Tras crear el `user` con `role="super_admin"`, dentro de la transacción llamar `ensurePlatformMembership(user.id, tx)` y setear `lastActiveOrganizationId`
- [ ] 5.3 Post-commit: `setActiveOrganization`
- [ ] 5.4 Redirect: igual que setup, ir a `/super`

## 6. Eliminar redirect super a /super de los layouts del workspace

> Si el change 1 ya estaba archivado, estos pasos ya están aplicados. Confirmar y saltar.

- [ ] 6.1 `app/(app)/layout.tsx`: eliminar `if (session.user.role === "super_admin") redirect("/super")` (si todavía existe)
- [ ] 6.2 `app/admin/layout.tsx`: eliminar `if (session.user.role === "super_admin") redirect("/super")` (si todavía existe)

## 7. Simplificar `redirectToDashboard` (limpiar código muerto)

- [ ] 7.1 En `lib/auth/guards.ts`, en `redirectToDashboard()`:
  - Eliminar la rama "super sin membresía → /super" como ruta normal
  - Mantenerla como **defensa en profundidad**: si `super_admin && activeOrgRole === null`, primero llamar `await ensurePlatformMembership(userId)` y luego re-resolver activeOrg; si después de eso sigue null, recién entonces `redirect("/super")` con un `console.error` indicando el bug.
- [ ] 7.2 En `lib/auth/derive-dashboard-href.ts`, dejar el algoritmo legacy intacto (sirve a callers que no tienen contexto de org). Documentar en comment de cabecera que la rama "super sin membresía → /super" es ahora defensiva.

## 8. UI del panel `/super` como "Plataforma"

- [ ] 8.1 `app/super/(protected)/layout.tsx`: cambiar el `<span>Panel super</span>` del header por `<span>Plataforma Docentix</span>` (o `<span>Panel de plataforma</span>` — elegir el más corto que respete el copy en español neutral)
- [ ] 8.2 `components/layout/contexts/super.ts`: agregar al final del sidebar config un item:
  - `{ key: "back-to-workspace", label: "Volver a mi institución", href: "/post-login" }`
  - El href `/post-login` deja que `redirectToDashboard()` calcule el destino correcto basado en la org activa del super.

## 9. Sidebar del workspace muestra "Panel de plataforma" para supers

- [ ] 9.1 En `components/layout/contexts/app.ts` y `components/layout/contexts/admin.ts`: agregar un item condicional al final del sidebar:
  - `{ key: "platform-panel", label: "Panel de plataforma", href: "/super", role: "super_admin" }`
- [ ] 9.2 En `components/layout/app-sidebar.tsx` (o donde se renderiza el sidebar), filtrar items con `role` solo si el `role` actual del usuario lo permite. El `role` que viene a este componente ya distingue super_admin (`deriveMenuRole`).
- [ ] 9.3 Verificar que NO se renderiza para usuarios `admin` o `member` que no son super.

## 10. Spec de `auth-roles` — invertir regla de membership

- [ ] 10.1 En `openspec/changes/<este>/specs/auth-roles/spec.md`, escribir delta:
  - REMOVED Requirement: `Super_admin no pertenece a ninguna organización`
  - ADDED Requirement: `Super_admin SHALL pertenecer a la organización plataforma`
- [ ] 10.2 Cuando este change se archive, el spec final reflejará la nueva regla.

## 11. Tests

- [ ] 11.1 Tests unitarios de `getOrCreatePlatformOrg` y `ensurePlatformMembership`: idempotencia tras varias llamadas, comportamiento con transacciones
- [ ] 11.2 Test E2E manual (documentado, no automatizado):
  - Bootstrap: setup primer super → tras login, sidebar muestra "Plataforma Docentix" como org activa y "Panel de plataforma" como ítem del sidebar
  - Super accede a `/admin` con activeOrg = `docentix`: debería renderizar el dashboard admin de la org plataforma
  - Super alterna en team-switcher a otra org donde es member (si hay datos): debería poder usar `/app`
  - Super accede a `/super`: gate funciona, copy dice "Plataforma Docentix"

## 12. Documentación

- [ ] 12.1 Agregar sección "Org plataforma y rol super" a `next-app/AGENTS.md`. Resumir:
  - Constante `PLATFORM_ORG_SLUG = "docentix"`.
  - Toda mutación de `user.role = "super_admin"` debe llamar `ensurePlatformMembership(userId)` en la misma transacción.
  - `/super` es panel de staff, no dashboard de workspace.
- [ ] 12.2 Documentar en commit message del reset de migraciones que es un break intencional y que devs deben dropear DB local

## 13. Hand-off al change 3

- [ ] 13.1 En `proposal.md` del change `2026-05-16-slug-scoped-workspace-routes`, actualizar la sección "Codebase assumptions at start" si las decisiones de este change difieren (en particular si el ítem "Panel de plataforma" en sidebar ya está en su lugar)
- [ ] 13.2 Anotar en archive-report: helpers `getOrCreatePlatformOrg` y `ensurePlatformMembership` están listos para reutilizar en flows de slug routing del change 3
