## 1. Schema (better-auth user.additionalFields)

- [ ] 1.1 En `lib/auth/server.ts`, agregar `user.additionalFields.lastActiveOrganizationId = { type: "string", required: false, input: false }`.
- [ ] 1.2 Comentar `import "server-only"` en `server.ts`, `emails.ts`, `db/client.ts`. Ejecutar `npm run db:generate-auth-schema`. Restaurar imports.
- [ ] 1.3 Verificar que `user` table en `lib/db/schema/auth.ts` ahora tenga `lastActiveOrganizationId: text("last_active_organization_id")`.
- [ ] 1.4 `npm run db:generate` para nueva migración SQL incremental.
- [ ] 1.5 (Pendiente para el usuario): `npm run db:push` en su BD local.

## 2. Helpers

- [ ] 2.1 En `lib/auth/guards.ts`, agregar `loadActiveOrganizationsFor(userId)` que devuelva `{ id, name, logo, role }[]` joinando `member` con `organization` filtrado por `member.status='active'`. Ordenar por `organization.name`.
- [ ] 2.2 En `lib/auth/guards.ts`, agregar `resolveActiveOrganization({ userId, sessionActiveOrgId, lastActiveOrgId, activeOrgs })` que retorne `{ activeOrgId, needsPersist }`. Lógica:
  - Si `sessionActiveOrgId` está en `activeOrgs` → return `{ activeOrgId: sessionActiveOrgId, needsPersist: false }`.
  - Si `lastActiveOrgId` está en `activeOrgs` → return `{ activeOrgId: lastActiveOrgId, needsPersist: true }`.
  - Si `activeOrgs.length > 0` → return `{ activeOrgId: activeOrgs[0].id, needsPersist: true }`.
  - Si vacío → return `{ activeOrgId: null, needsPersist: false }`.

## 3. Server action: switch

- [ ] 3.1 Crear `components/layout/team-switcher-actions.ts` con `switchActiveOrganizationAction(orgId)`:
  - `requireSession`.
  - SELECT membership; verificar `status='active'` para esa org.
  - `auth.api.setActiveOrganization({ body: { organizationId: orgId }, headers: await headers() })`.
  - `UPDATE user SET lastActiveOrganizationId = $orgId WHERE id = $userId`.
  - `revalidatePath("/")`.
  - Retornar `ActionResult`.

## 4. Componente TeamSwitcher

- [ ] 4.1 Crear `components/layout/team-switcher.tsx` (client component) con tipo prop `{ orgs, activeOrgId, action }`. Usa `DropdownMenu` de shadcn dentro de `SidebarMenu` siguiendo el patrón de `nav-user.tsx`.
- [ ] 4.2 Trigger: `SidebarMenuButton size="lg"` con avatar/iniciales de la org activa (componente `OrgAvatar` ya existe en `components/organizations/`), nombre, y `CaretUpDownIcon` a la derecha.
- [ ] 4.3 Content: header "Cambiar de organización", item por cada org (avatar + nombre + check si activa). Click → `useTransition` → llama action → `router.refresh()` + toast on success.

## 5. Sidebar config

- [ ] 5.1 En `components/layout/types.ts`, agregar:
  ```ts
  export type TeamSwitcherOrg = { id: string; name: string; logo: string | null };
  export type TeamsConfig = {
    orgs: TeamSwitcherOrg[];
    activeOrgId: string | null;
    onSwitch: (orgId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  };
  ```
- [ ] 5.2 En `components/layout/app-sidebar.tsx`, aceptar prop opcional `teams?: TeamsConfig`. Si llega → renderizar `<TeamSwitcher>` en el `SidebarHeader`. Si no → renderizar `NavBrand` (comportamiento actual).

## 6. Layouts

- [ ] 6.1 `app/admin/layout.tsx`:
  - Cargar `activeOrgs = await loadActiveOrganizationsFor(session.user.id)`.
  - Si vacío: redirect `/account/organizations`.
  - `resolved = resolveActiveOrganization({...})`.
  - Si `resolved.needsPersist`: llamar `setActiveOrganization` y opcionalmente actualizar `user.lastActiveOrganizationId`.
  - Pasar `teams={{ orgs: activeOrgs, activeOrgId: resolved.activeOrgId, onSwitch: switchActiveOrganizationAction }}` al `<AppSidebar>`.
- [ ] 6.2 `app/app/layout.tsx`: idem.
- [ ] 6.3 `app/super/(protected)/layout.tsx`: NO cambia (no se pasa `teams`).

## 7. Verificación

- [ ] 7.1 `npx tsc --noEmit`: 0 errores.
- [ ] 7.2 Smoke manual:
  - Login con un usuario que tiene 2+ orgs. Verificar que el switcher muestra ambas y la activa marcada.
  - Cambiar a otra org. Verificar que el header del switcher actualiza y los datos del shell reflejan la nueva.
  - Logout + login. Verificar que arranca en la última org elegida (no en la primera alfabética).
  - Suspender al usuario en su org activa desde otra cuenta. Refresh. Debe redirigir a `/account/suspended`. Volver a `/account/organizations`, entrar a otra org → switcher resuelve OK.
  - Verificar que `/super` sigue mostrando NavBrand (no switcher).

## Review Workload Forecast

- Líneas estimadas: ~280-340.
- 400-line budget risk: **Medium**.
- Chained PRs: **No** por ahora — todos los archivos son cohesivos al feature. Si se va sobre, partir en (a) schema+helpers+action y (b) UI+layouts.
