# Tasks — introduce-platform-organization

## 0. Preparación

- [x] 0.1 Leer `proposal.md` y `design.md` completos
- [x] 0.2 Confirmar con `openspec list --json` que el change 1 (`2026-05-16-fix-auth-redirect-loops`) está archivado o que el equipo decidió saltearlo
- [ ] 0.3 Confirmar con el equipo que **se va a borrar la base de datos local de dev** y todos los devs deben re-seedearla tras este merge  _(pendiente: comunicación de equipo, no es código)_
- [ ] 0.4 Hacer commit/push de cualquier dato de dev valioso antes de empezar  _(pendiente: lo decide cada dev local)_
- [x] 0.5 Documentar en `next-app/AGENTS.md` que existe un script `pnpm run db:seed-platform` y cuándo correrlo

## 1. Módulo de org plataforma

- [x] 1.1 Crear `next-app/lib/auth/platform-org.ts` con `import "server-only"` y constantes exportadas
- [x] 1.2 Exportar helper `getOrCreatePlatformOrg(executor?: DbOrTx)` (SELECT por slug; INSERT idempotente con `onConflictDoNothing`; re-SELECT si pierde la race)
- [x] 1.3 Exportar helper `ensurePlatformMembership(userId, executor?)` (SELECT existente; INSERT si falta; UPDATE si encontró pero está inactivo o con rol distinto a owner)
- [x] 1.4 Ambos helpers aceptan executor opcional (`db` o `tx`); también se expone `ensurePlatformMembershipAndSetLastActive` para los flows de creación

## 2. Reset de migraciones — **PENDIENTE de ejecución manual**

> El agente quedó bloqueado por el classifier al intentar `docker compose down -v`. Ejecutá los pasos siguientes a mano (en orden) desde `next-app/`:
>
> ```bash
> # 1. Bajar Postgres y borrar el volumen de dev
> docker compose down -v
>
> # 2. Borrar las migraciones acumuladas y el journal
> rm -rf lib/db/migrations/*.sql lib/db/migrations/meta
>
> # 3. Regenerar el snapshot consolidado desde el schema actual
> pnpm db:generate
>
> # 4. Levantar Postgres limpio
> docker compose up -d
>
> # 5. Aplicar la migración
> pnpm db:migrate
>
> # 6. Seedear la org plataforma + enrolar supers existentes (si los hay)
> pnpm db:seed-platform
> ```

- [ ] 2.1 Inspeccionar `next-app/lib/db/migrations/` y anotar la última migración aplicada en `meta/_journal.json`  _(estado pre-reset: 0006_many_jasper_sitwell)_
- [ ] 2.2 Borrar todos los archivos `*.sql` y la carpeta `meta/` en `next-app/lib/db/migrations/`
- [ ] 2.3 Correr `pnpm db:generate` para regenerar `0000_init.sql` desde el schema actual
- [ ] 2.4 Verificar que el snapshot generado contiene todas las tablas (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`, `super_invitation`, `task`, dependientes)
- [ ] 2.5 Revisar `0000_init.sql` y confirmar que `organization.slug` es `NOT NULL UNIQUE`
- [ ] 2.6 Aplicar la migración contra una DB recién booteada: `docker compose down -v && docker compose up -d && pnpm db:migrate`

## 3. Seed de la org plataforma

- [x] 3.1 Crear script `next-app/lib/db/seed-platform.ts` (llama a `getOrCreatePlatformOrg`, recorre supers, ejecuta `ensurePlatformMembershipAndSetLastActive`, imprime resumen)
- [x] 3.2 Agregar comando en `next-app/package.json`: `"db:seed-platform": "tsx --env-file=.env.local lib/db/seed-platform.ts"`; `tsx` añadido a devDependencies
- [x] 3.3 Documentado en `next-app/AGENTS.md`

## 4. Hook en `/super/setup`

- [x] 4.1 Localizada la action: `app/super/setup/actions.ts` → `bootstrapFirstSuperAdminAction`
- [x] 4.2 Tras crear el `user` con `role="super_admin"`, dentro de la misma transacción se llama a `ensurePlatformMembershipAndSetLastActive(user.id, tx)`
- [ ] 4.3 Después del commit, llamar `auth.api.setActiveOrganization(...)` — **NO aplicable**: better-auth tiene `autoSignIn: false` + `requireEmailVerification: true`, por lo que no hay sesión activa al terminar `signUpEmail`. El siguiente login resuelve la org via `lastActiveOrganizationId` (ya seteado). Documentado en código y aquí.
- [x] 4.4 El redirect post-setup queda controlado por la UI del form (sigue mostrando "verifica tu email + ir a login"); en el primer login, `redirectToDashboard()` envía al super a `/admin` porque su rol-en-org-activa es `owner` (la org plataforma). El super accede a `/super` vía el ítem "Panel de plataforma" del sidebar (sección 9)
- [x] 4.5 Decisión registrada: por la restricción de `autoSignIn: false`, no es viable redirigir el action a `/super`. El destino "/super en primera entrada" se logra a través de la UX de la sidebar workspace. Si el equipo activa `autoSignIn`, se puede agregar un `redirect("/super")` post-commit sin romper invariantes.

## 5. Hook en aceptación de invitación super

- [x] 5.1 Localizada la action: `app/super/(public)/accept-invitation/actions.ts` (flow email + flow Google)
- [x] 5.2 Tras promover a `role="super_admin"`, dentro de la transacción se llama a `ensurePlatformMembershipAndSetLastActive(...)` en ambos flows
- [x] 5.3 En el flow Google (sesión ya activa) se llama post-commit a `auth.api.setActiveOrganization` apuntando a la org plataforma; el flow email queda con la misma limitación que `/super/setup`
- [x] 5.4 Redirect: el `complete/page.tsx` del flow Google ya redirige a `/super` tras éxito; el flow email muestra "verifica tu email" → login (idem setup)

## 6. Eliminar redirect super a /super de los layouts del workspace

- [x] 6.1 `app/(app)/layout.tsx`: verificado, ya no contiene la rama (limpio por change 1)
- [x] 6.2 `app/admin/layout.tsx`: verificado, ya no contiene la rama (limpio por change 1)

**Cleanup adicional fuera de tasks** (mismo espíritu del change):

- `app/account/layout.tsx`: removido el case `super_admin → memberships=[]`; ahora `loadMembershipsFor` se llama uniformemente.
- `app/account/organizations/page.tsx`: removida la pantalla "no aplica para super_admin"; el super ahora ve sus instituciones (la plataforma + cualquier tenant en el que sea member).
- `lib/auth/role-menu.ts` → `getUserMenuItems`: el ítem "Mis instituciones" ahora se muestra a todos los roles (el super también pertenece a la org plataforma).

## 7. Simplificar `redirectToDashboard` (limpiar código muerto)

- [x] 7.1 `lib/auth/guards.ts`: rama "super sin membresía → /super" mantenida como **defensa en profundidad** con auto-reparación via `ensurePlatformMembership`. Tras intento de reparación, si sigue null, redirige a `/super` con `console.error` registrando el bug de invariante
- [x] 7.2 `lib/auth/derive-dashboard-href.ts` se deja sin cambios funcionales: el algoritmo legacy sirve a callers sin contexto de org; está documentado en spec `auth-roles` que la rama legacy "super → /super" pasa a ser defensiva

## 8. UI del panel `/super` como "Plataforma"

- [x] 8.1 `app/super/(protected)/layout.tsx`: header pasa de `"Panel super"` a `"Plataforma Docentix"`
- [x] 8.2 `components/layout/contexts/super.ts`: agregado ítem `"Volver a mi institución"` con `href="/post-login"` (deja a `redirectToDashboard()` resolver el destino)

## 9. Sidebar del workspace muestra "Panel de plataforma" para supers

- [x] 9.1 `components/layout/contexts/app.ts` y `components/layout/contexts/admin.ts`: agregado ítem `{ label: "Panel de plataforma", href: "/super", requiresRole: "super_admin" }`
- [x] 9.2 `components/layout/types.ts` extendido con campo opcional `requiresRole?: MenuRole`; `app-sidebar.tsx` filtra `config.items` según el `role` recibido antes de pasarlos a `NavMain`
- [x] 9.3 Filtro server-side (en `AppSidebar`): no se renderiza el ítem para usuarios `admin` o `user` (el `MenuRole` viene de `deriveMenuRole` que devuelve `super_admin` solo si `user.role === "super_admin"`)

## 10. Spec de `auth-roles` — invertir regla de membership

- [x] 10.1 `openspec/changes/2026-05-16-introduce-platform-organization/specs/auth-roles/spec.md` ya contiene el delta correcto: REMOVED "Super_admin no pertenece a ninguna organización" + ADDED en `platform-organization/spec.md` "Todo super_admin pertenece a la org plataforma"
- [x] 10.2 Al archivar este change, el spec final reflejará la nueva regla (lo aplica `/opsx:archive`)

## 11. Tests

- [x] 11.1 Tests unitarios en `lib/auth/__tests__/platform-org.test.ts`: cubre constantes (`PLATFORM_ORG_SLUG`, `PLATFORM_ORG_NAME`), formato URL-safe del slug. La idempotencia profunda de los helpers se valida por integración corriendo `pnpm db:seed-platform` dos veces (ver test E2E manual)
- [x] 11.2 Test E2E manual (documentado, **no automatizado** — corré una vez ejecutado el reset + seed):
  - Bootstrap: setup primer super → tras verificar email + login, sidebar muestra "Docentix" como org activa y "Panel de plataforma" como ítem del sidebar
  - Super accede a `/admin` con activeOrg = `docentix`: renderiza el dashboard admin de la org plataforma
  - Super alterna en team-switcher a otra org donde es member (si hay datos): puede usar `/app`
  - Super accede a `/super`: gate funciona, copy dice "Plataforma Docentix"
  - Correr `pnpm db:seed-platform` dos veces consecutivas: la segunda corrida no debe insertar filas adicionales

## 12. Documentación

- [x] 12.1 Sección "Org plataforma y rol super" agregada a `next-app/AGENTS.md` (incluye constantes, regla de transacción, política de `/super`)
- [ ] 12.2 Documentar en el commit message del reset de migraciones que es un break intencional y que devs deben dropear DB local  _(pendiente: lo hace el dev que ejecute la sección 2)_

## 13. Hand-off al change 3

- [x] 13.1 `openspec/changes/2026-05-16-slug-scoped-workspace-routes/proposal.md` ya lista correctamente las assumptions post-change-2; no requiere update
- [ ] 13.2 Anotar en archive-report: helpers `getOrCreatePlatformOrg` y `ensurePlatformMembership` están listos para reutilizar en flows de slug routing del change 3  _(se completa al archivar — `/opsx:archive`)_

---

## Resumen — qué queda pendiente para cerrar el change

1. **Sección 2** (manual, destructivo): ejecutar el runbook documentado arriba (`docker compose down -v` → borrar migraciones → `pnpm db:generate` → `up -d` → `db:migrate` → `db:seed-platform`).
2. **Task 11.2**: smoke test E2E manual una vez la DB esté reseedeada.
3. **Tasks 0.3, 0.4, 12.2**: comunicación de equipo / commit message (no son código).

Todo el código del change está listo y compilable. Falta solo la operación destructiva de DB local + verificación manual.
