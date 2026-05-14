## 1. Schema (better-auth additionalFields)

- [x] 1.1 En `next-app/lib/auth/server.ts`, modificar la llamada a `organization()` agregando `schema.member.additionalFields.status = { type: "string", required: true, defaultValue: "active", input: false }`.
- [x] 1.2 Ejecutar `npm run db:generate-auth-schema`. **Gotcha encontrado**: el CLI no resuelve `import "server-only"` — hay que comentarlo temporalmente en los 3 archivos transitivos (`server.ts`, `emails.ts`, `db/client.ts`) y restaurar después. `member.status` quedó en línea 114: `text("status").default("active").notNull()`.
- [x] 1.3 `npm run db:generate` produjo `lib/db/migrations/0000_simple_piledriver.sql` (es el primer migration; el repo venía usando solo `db:push`).
- [ ] 1.4 `npm run db:push` para aplicar la columna a la BD local. **Pendiente — el usuario lo ejecuta**.

## 2. Guards y helpers

- [x] 2.1 `loadActiveMembershipsFor(userId)` agregado en `lib/auth/guards.ts`.
- [x] 2.2 `redirectToDashboard` ahora usa `loadActiveMembershipsFor`.
- [x] 2.3 `app/admin/layout.tsx` y `app/app/layout.tsx` usan `loadActiveMembershipsFor`.
- [x] 2.4 `requireTenantAdminFor` (en `app/account/organizations/[id]/actions.ts`) ahora exige `status === 'active'`.

## 3. Server actions nuevas

- [x] 3.1 `updateMemberRoleAction({ memberId, role })` agregada con todas las reglas (rol ∈ admin/member, no self, no último admin).
- [x] 3.2 `setMemberStatusAction({ memberId, status })` agregada con las mismas reglas.

## 4. UI: members table con acciones

- [x] 4.1 `MemberRow` extendido con `status: 'active' | 'inactive'`.
- [x] 4.2 Columna "Estado" con badge `Activo`/`Suspendido` agregada.
- [x] 4.3 Props `canManage` y `actions` agregadas; columna de acciones se muestra solo cuando `canManage`. Se extrajo `MemberRowActions` (client component) en `components/organizations/member-row-actions.tsx` para mantener la tabla server-side.
- [x] 4.4 Dropdown items con disabled correcto (self, último admin).
- [x] 4.5 `AlertDialog` envuelve "Suspender" y "Cambiar a miembro" sobre admin.

## 5. Plumbing en páginas

- [x] 5.1 `app/account/organizations/[id]/page.tsx`: pasa `canManage={isAdmin}` y `actions` cuando admin.
- [x] 5.2 Redirige a `/account/suspended?org=${id}` cuando `membership.status === 'inactive'`.
- [x] 5.3 `app/super/(protected)/organizations/actions.ts::getOrganizationDetail` ahora carga `status`. El render del super NO pasa `canManage` (sin acciones).
- [x] 5.4 `app/account/organizations/page.tsx`: badge "Suspendida" + link a `/account/suspended?org=...` cuando inactive.

## 6. Página de suspensión

- [x] 6.1 Creada `app/account/suspended/page.tsx` con resolución de nombre por `org` query param, fallback "una organización", botón a `/account/organizations`.
- [x] 6.2 `metadata = { title: "Acceso suspendido — Docentix" }`.

## 7. Verificación

- [x] 7.1 `npx tsc --noEmit`: **0 errores**.
- [ ] 7.2 Smoke manual: **Pendiente — el usuario lo verifica tras correr `db:push`**.
- [ ] 7.3 Verificar que el panel super sigue mostrando members sin acciones. **Pendiente — el usuario lo verifica visualmente**.

## Review Workload Forecast

- Líneas estimadas: ~280-350 (schema regen + 2 actions + tabla con dropdown + página suspendido + plumbing + guards).
- 400-line budget risk: **Medium** (cerca del límite). Si se va sobre, partir en (a) schema+guards+actions y (b) UI.
- Chained PRs: **No por ahora**. Si al implementar el diff supera 400 líneas, partir en dos.
- Decision needed before apply: **No** — todo confirmado por el usuario.
