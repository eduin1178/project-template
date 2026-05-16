## Chain context

Este change es **el segundo de una cadena de tres** que rediseña el modelo de autenticación y layout de Docentix.

| # | Change | Estado al cerrar |
|---|--------|------------------|
| 1 | `2026-05-16-fix-auth-redirect-loops` | Bugs de redirect parchados sobre el modelo viejo. `super_admin` SIGUE sin pertenecer a orgs. |
| **2 (este)** | `2026-05-16-introduce-platform-organization` | `super_admin` pasa a ser miembro `owner` de una org plataforma. `/super` deja de ser dashboard y se vuelve panel de staff. Reset de migraciones. |
| 3 | `2026-05-16-slug-scoped-workspace-routes` | Rutas `/app/*` y `/admin/*` migran a `/[slug]/*` y `/[slug]/admin/*`. Shell unificado en componente `AppShell`. |

**Prerequisite**: change 1 archivado, O el equipo decidió saltearlo (este change reemplaza por completo la lógica que el change 1 toca, así que es seguro empezar acá si está actualizado). Si el change 1 no fue archivado, leer su `proposal.md` para entender los bugs que estamos resolviendo de raíz.

**Codebase assumptions at start**:
- `next-app/lib/auth/server.ts` configura better-auth con `admin` y `organization` plugins.
- `next-app/lib/auth/guards.ts` expone `redirectToDashboard()` (que el change 1 ya hizo robusta al caso "super con membresías"; este change la simplifica porque ese caso ahora es el normal).
- `lib/db/schema/auth.ts` tiene tablas `user`, `organization` (con `slug` unique), `member`, `invitation`.
- `app/super/setup/page.tsx` permite crear el primer super con `SUPER_ADMIN_SETUP_TOKEN`.
- Existen migraciones acumuladas en `next-app/lib/db/migrations/`.
- No hay producción: **podemos resetear migraciones y consolidar el schema desde cero**.

**Hand-off al change 3**:
- El schema queda limpio con `organization.slug` poblado para toda fila.
- `super_admin` con membresía activa funciona end-to-end en `/admin` y `/app`.
- `/super` queda visualmente identificable como "panel de staff" (no como un dashboard de workspace).
- `redirectToDashboard()` queda con el código muerto eliminado (no hay rama "super sin membresía → /super" porque el seed garantiza membresía).
- `team-switcher-actions.ts` queda preparado para empezar a aceptar slug en el change 3 (pero todavía recibe id en este change).

**Para retomar en una sesión nueva**: leé este `proposal.md`, `design.md` y `tasks.md`. Verificá con `openspec list --json` que `2026-05-16-introduce-platform-organization` aparece como no-archivado y que el siguiente change `2026-05-16-slug-scoped-workspace-routes` tampoco. Si el slug routing change ya empezó, ESTE change ya está cerrado.

---

## Why

El modelo actual trata `super_admin` como un *modo exclusivo*: un super no puede ser miembro de ninguna org, no puede usar el producto como cliente, y cualquier ruta de workspace lo expulsa a `/super`. Eso genera tres problemas concretos:

1. **No dogfooding**: el equipo de Docentix no puede usar el producto como cualquier institución para detectar fricciones de UX. Tendrían que usar una cuenta sin rol super, perdiendo la capacidad de gestionar tenants.
2. **Modelo conceptual roto**: tratar "capacidad" (`super_admin`) y "modo de uso" (workspace de una org) como mutuamente excluyentes contradice cómo la industria lo modela. En Vercel, GitHub, Linear, Notion el staff de plataforma siempre tiene su propio workspace además del panel de staff.
3. **Casos especiales en el código**: cada layout tiene un branch `if (super_admin) redirect("/super")` que tiene que mantenerse alineado, y `auth-roles` tiene una regla "super_admin SHALL NOT tener registros en member" que el change 1 ya tuvo que parchear.

La solución es **garantizar que todo usuario (incluido el super) tenga al menos una membresía activa**, y reducir `super_admin` a una capacidad pura que solo controla acceso a `/super`. Para esto introducimos una **organización plataforma** (slug fijo `docentix`) donde todo super es `owner`. El equipo de Docentix usa esta org como su workspace propio y `/super` como panel de gestión de tenants.

Aprovechamos que no hay producción para **resetear las migraciones** y dejar el schema consolidado en una sola migración inicial limpia + la migración de seed de la org plataforma. Esto elimina la deuda histórica de migraciones intermedias y simplifica el rebuild local.

## What Changes

### Modelo y datos

- Crear **organización plataforma** con `slug = "docentix"`, nombre `"Docentix"`, logo placeholder. Es una org real en la tabla `organization`, idéntica estructuralmente a cualquier tenant.
- Garantizar que **todo `super_admin`** tenga registro en `member` con `role = "owner"`, `status = "active"`, `organizationId = <orgPlataforma.id>`. Esto vale para supers existentes (via seed/migration) y para supers nuevos (via hook en aceptación de invitación super y en `/super/setup`).
- **Eliminar la regla** "Super_admin SHALL NOT tener registros en member" de la spec `auth-roles`. Pasa a ser "Super_admin SHALL tener al menos una membresía activa en la organización plataforma".
- **Reset de migraciones**: borrar `next-app/lib/db/migrations/*` y regenerar con `drizzle-kit generate` una única migración inicial `0000_init.sql` que represente el schema actual + slug populated. Agregar una segunda migración `0001_seed_platform_organization.sql` (o ejecutarlo via script aparte) que crea la org plataforma de forma idempotente.

### Auth y routing

- `redirectToDashboard()` en `lib/auth/guards.ts` se simplifica: como ahora todo super tiene membresía, el caso "super sin membresía → /super" se vuelve imposible. La función queda gobernada exclusivamente por rol-en-org-activa.
- `redirectToDashboard()` SHALL rechazar el caso "usuario sin membresías activas" lanzando a `/account/organizations` para usuarios normales y a `/super` solo si el usuario es super (defensa en profundidad — no debería ocurrir tras el seed).
- `/super/(protected)/layout.tsx` permanece igual; el gate de `user.role === "super_admin"` ya es correcto.
- `/super/layout.tsx` y `/super/(public)/layout.tsx` no cambian.
- Quitar las ramas que el change 1 había agregado para tolerar "super sin membresías" en `deriveDashboardHref` y en `redirectToDashboard`, dejando como pre-condition documentada en el código: "todo super tiene membresía en la org plataforma".

### UX del panel `/super`

- El header de `/super` SHALL identificar visualmente la sección como **"Panel de plataforma"** (no "Panel super"), reforzando que es área de staff y no un dashboard de workspace. Copy: español neutral, "Plataforma" o "Plataforma Docentix".
- El sidebar del workspace (`/app` y `/admin`) SHALL incluir, para usuarios con `user.role === "super_admin"`, un ítem extra **"Panel de plataforma"** con `href="/super"`. Este ítem aparece como entrada de navegación entre roles, no como acción del user menu.
- El sidebar del `/super` SHALL incluir un ítem **"Volver a mi institución"** que navega a la org activa del super (slug `docentix` por defecto).

### Flujos de creación de super

- **`/super/setup`**: tras crear el primer `super_admin`, el flujo SHALL ejecutar (idempotentemente):
  1. Crear la org plataforma si no existe.
  2. Insertar `member(userId=<nuevoSuper>, organizationId=<orgPlataforma>, role="owner", status="active")`.
  3. Setear `user.lastActiveOrganizationId = <orgPlataforma.id>`.
  4. Setear `session.activeOrganizationId = <orgPlataforma.id>` via `auth.api.setActiveOrganization`.
- **Aceptación de invitación super** (`/super/(public)/accept-invitation`): tras crear el `super_admin` nuevo, ejecutar los mismos pasos 1-4.

### Limpieza

- Documentar en `next-app/AGENTS.md` la regla nueva: "todo `super_admin` es `owner` de la org plataforma (slug `docentix`); `/super` es panel de staff, no dashboard de workspace".
- Remover de la spec `auth-roles` el requirement "Super_admin no pertenece a ninguna organización" (este change lo MODIFICA en sentido opuesto).

## Capabilities

### New Capabilities

- `platform-organization`: La organización plataforma (slug fijo `docentix`) donde todo `super_admin` es miembro `owner`. Incluye reglas de bootstrap, idempotencia, atribución y la garantía de que el seed es reentrante.

### Modified Capabilities

- `auth-roles`: Invierte la regla "super sin membership". Define `super_admin` como capacidad y exige membresía mínima en la org plataforma.
- `db-foundation`: Reset de migraciones a una migración inicial única + migración de seed. La política "migraciones nunca se editan" cuenta a partir del nuevo `0000_init.sql`.
- `super-setup`: El flujo de bootstrap del primer super pasa a crear la org plataforma y la membresía.
- `super-invitations`: Aceptación de invitación super crea automáticamente la membresía en la org plataforma.
- `route-protection`: Las ramas defensivas para "super sin membresía" se mantienen como guardas de defensa en profundidad pero ya no son ruta normal.
- `super-panel`: Header/copy cambian a "Panel de plataforma". Sidebar suma "Volver a mi institución".
- `account-shell`: El sidebar del workspace incluye ítem "Panel de plataforma" cuando el usuario es super.

### Out of scope

- NO se cambian las URLs (`/app`, `/admin`, `/super` siguen igual). Eso es change 3.
- NO se introduce slug en URLs. Eso es change 3.
- NO se unifica el componente shell `AppShell`. Eso es change 3.
- NO se modifican los tasks de onboarding ni los emails de invitación (excepto si el copy mencionaba la regla "super sin org").

## Impact

### Código

- **Schema**: `lib/db/schema/auth.ts` sin cambios estructurales; solo se asegura que `organization.slug` siga unique y no-nullable, y que `member.status` siga activo por defecto.
- **Migraciones**: directorio `next-app/lib/db/migrations/` se vacía y regenera. Un solo archivo `0000_init.sql` representa el snapshot completo. Un script TS `next-app/lib/db/seed-platform.ts` ejecuta el seed de la org plataforma (idempotente).
- **`next-app/lib/auth/guards.ts`**: `redirectToDashboard` simplificada (sin rama super-sin-membresía como ruta normal). Helper nuevo `ensurePlatformMembership(userId)` reutilizable por setup y aceptación.
- **`next-app/lib/auth/platform-org.ts`**: módulo nuevo con constantes (`PLATFORM_ORG_SLUG = "docentix"`, `PLATFORM_ORG_NAME = "Docentix"`), helpers (`getOrCreatePlatformOrg(executor)`, `ensurePlatformMembership(userId, executor)`).
- **`next-app/app/super/setup/page.tsx`** (o su action equivalente): tras crear el super, llamar a `ensurePlatformMembership(newUser.id)` y a `setActiveOrganization`.
- **`next-app/app/super/(public)/accept-invitation/_components/accept-form.tsx`** (o su action): mismo hook post-creación.
- **`next-app/app/(app)/layout.tsx`** y **`/admin/layout.tsx`**: agregar ítem "Panel de plataforma" cuando el usuario es super (lo construye `appSidebarConfig` / `adminSidebarConfig` o se inyecta como override en el render del `AppSidebar`).
- **`next-app/components/layout/contexts/super.ts`**: agregar ítem "Volver a mi institución".
- **`next-app/app/super/(protected)/layout.tsx`**: cambiar copy del header de `"Panel super"` a `"Panel de plataforma"`.
- **`next-app/AGENTS.md`**: agregar sección "Org plataforma y rol super".

### Datos

- Una fila nueva en `organization` con `slug = "docentix"`.
- Una fila por cada super existente en `member` con `role = "owner"`, `organizationId = <docentix.id>`, `status = "active"`.
- `user.lastActiveOrganizationId` de cada super se setea al id de la org plataforma.

### Migración de migraciones (reset)

- Snapshot del schema actual via `drizzle-kit generate` produciendo `0000_init.sql`.
- Borrar archivos `0001_*.sql`, `0002_*.sql`, etc. previos.
- Borrar carpeta `meta/` y dejar que drizzle la regenere.
- Borrar la DB local de dev (`docker compose down -v` + `up`) y aplicar `0000_init.sql` desde cero.
- Documentar en `next-app/AGENTS.md` que el reset ocurrió y que migraciones anteriores no son recuperables — si alguien tiene una DB local con datos, debe reseedear.

### Riesgo

- **Medio**. El reset de migraciones es destructivo (todas las DBs de dev del equipo se pierden). Se mitiga porque (a) no hay producción y (b) seedeo de dev existe.
- Inserción de membresía super en una org existe-real puede confundir a un super que abre `/admin` y ve la org plataforma como su workspace. Se mitiga con copy claro en el header ("Plataforma Docentix") y con el ítem "Panel de plataforma" siempre visible en el sidebar.
- Si el seed falla a mitad de camino (org creada, membresía no insertada), el siguiente login del super seguiría sin membresía y caería a `/super` por la defensa en profundidad. El helper `ensurePlatformMembership` es idempotente, por lo que un retry resuelve el caso.

### Hand-off al change 3

- Schema con slug populated y único para toda org.
- Helpers `getOrCreatePlatformOrg`, `ensurePlatformMembership` reutilizables.
- Sidebar ya muestra la org plataforma como una org más, lo que prepara al usuario para verla en `/docentix` cuando el change 3 introduzca slug en URL.
- `team-switcher-actions.ts` sigue recibiendo `organizationId` (string id) — el change 3 lo refactoriza a slug.
