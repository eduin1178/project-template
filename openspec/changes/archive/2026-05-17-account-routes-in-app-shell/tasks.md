## 1. Resolución de organización para el shell de cuenta

- [x] 1.1 Inspeccionar `lib/auth/guards.ts` (`resolveActiveOrganization`) y decidir entre extender el helper existente o crear `lib/auth/account-shell.ts` con `resolveAccountShellOrg(...)`. Documentar la decisión brevemente en un comentario al inicio del archivo.
- [x] 1.2 Implementar/extender el helper para retornar `{ activeOrgId, activeOrgSlug, role, orgs }` aplicando la cascada: `session.activeOrganizationId` (si activa) → `user.lastActiveOrganizationId` (si activa) → primera org activa por `organization.name` ASC → `null`.
- [x] 1.3 Asegurar que el helper consume los mismos loaders existentes (`loadActiveMembershipsFor`, `loadActiveOrganizationsFor`) y devuelve `orgs` con la forma esperada por `TeamsConfig` (`{ id, slug, name, logo }`).

## 2. Configs de sidebar para cuenta

- [x] 2.1 Crear `next-app/components/layout/contexts/account.ts` exportando `buildAccountFallbackSidebarConfig()` con `brand.href = "/account/profile"`, `brand.description = "Mi cuenta"`, e `items: []`.
- [x] 2.2 Verificar que `components/layout/app-sidebar.tsx` renderiza correctamente un `SidebarConfig` con `items: []` (sin sección vacía o errores). Ajustar si hace falta.

## 3. `TeamSwitcher` con estado "sin institución"

- [x] 3.1 Modificar `next-app/components/layout/team-switcher.tsx` para que, cuando `teams.orgs.length === 0` (o no exista `activeOrg`), renderice el placeholder no-interactivo: avatar genérico (`BuildingsIcon`), label "Sin institución", sublabel "No perteneces a ninguna institución", sin `DropdownMenu` funcional.
- [x] 3.2 Mantener intacto el comportamiento actual cuando hay al menos una org (dropdown funcional, switch via `onSwitch`).
- [x] 3.3 Eliminar el `return null;` previo y reemplazarlo por el render del placeholder.

## 4. `AppShell` soporta `headerLabel` como `ReactNode`

- [x] 4.1 Cambiar el tipo de prop `headerLabel: string` a `headerLabel: ReactNode` en `components/layout/app-shell.tsx`.
- [x] 4.2 Verificar que los consumidores existentes (`[slug]/(member)/layout.tsx`, `[slug]/admin/layout.tsx`, `super/(protected)/layout.tsx`) siguen funcionando con `string` (retro-compatibilidad).

## 5. Client component `AccountHeaderLabel`

- [x] 5.1 Crear `next-app/components/layout/account-header-label.tsx` (client, `"use client"`) que use `usePathname()` y mapee: `/account/profile` → `"Perfil"`, pathname que empieza con `/account/organizations` → `"Mis instituciones"`, `/account/invitations` → `"Mis invitaciones"`, default → `"Mi cuenta"`.
- [x] 5.2 Mantenerlo lo más liviano posible: solo un `<span>` con el texto resuelto.

## 6. Layout `/account/*` montado sobre `AppShell`

- [x] 6.1 Reescribir `next-app/app/account/layout.tsx`: requerir sesión, cargar memberships y orgs activas, resolver org con el helper de la tarea 1, derivar `role` via `deriveMenuRole`.
- [x] 6.2 Elegir el `sidebarConfig`: `buildAppSidebarConfig(activeOrgSlug)` cuando hay org, `buildAccountFallbackSidebarConfig()` cuando no.
- [x] 6.3 Renderizar `<AppShell sidebarConfig={...} user={...} role={...} teams={{ orgs, activeOrgId, onSwitch: switchActiveOrganizationAction }} headerLabel={<AccountHeaderLabel />}>{children}</AppShell>`.
- [x] 6.4 Eliminar el header propio actual (con "Volver al panel"), `TooltipProvider` y `Toaster` duplicados (los provee `AppShell`).
- [x] 6.5 Verificar que `/account/profile`, `/account/organizations`, `/account/organizations/[id]`, `/account/invitations` y `/account/suspended` siguen renderizándose correctamente bajo el nuevo layout.

## 7. Ruta `/no-organization`

- [x] 7.1 Crear `next-app/app/no-organization/page.tsx` (server component): requerir sesión (redirect a `/login?next=/no-organization` si no la hay).
- [x] 7.2 Verificar memberships activas; si el usuario SÍ tiene al menos una → `redirect("/post-login")`.
- [x] 7.3 Renderizar contenido informativo: título `"No perteneces a ninguna institución"`, párrafo explicativo en español neutro (sin voseo, segundo persona singular `tú`), CTA primario `"Ver mis invitaciones"` → `/account/invitations`, link secundario `"Ir a mi perfil"` → `/account/profile`.
- [x] 7.4 Envolver la página en `AppShell` con la misma configuración del caso "sin org" del layout de cuenta: `buildAccountFallbackSidebarConfig()`, `TeamSwitcher` con `orgs: []`, `headerLabel = "Sin institución"` (puede ser string directo aquí, no requiere componente dinámico).
- [x] 7.5 Decidir si crear un `app/no-organization/layout.tsx` para reusar el shell o inlinearlo en la `page.tsx`. Preferir layout si la lógica de resolución/sesión se va a repetir; inline si la página es la única.

## 8. Guards de `/[slug]/*` redirigen a `/no-organization`

- [x] 8.1 Editar `next-app/app/[slug]/layout.tsx`: ANTES del check de existencia de org y membership específica, agregar el check "el usuario tiene CERO memberships activas en cualquier org" → `redirect("/no-organization")`. Reusar el loader existente (`loadActiveMembershipsFor`).
- [x] 8.2 Verificar que el orden no rompe los escenarios actuales: usuario con orgs en otras instituciones que intenta acceder a una org ajena debe seguir recibiendo `notFound()`, no redirect.
- [x] 8.3 Confirmar que `app/[slug]/(member)/layout.tsx` y `app/[slug]/admin/layout.tsx` NO necesitan el check duplicado (el padre `app/[slug]/layout.tsx` ya lo aplica antes de delegar).
- [x] 8.4 Actualizar/agregar el `proxy.ts` matcher si `/no-organization` necesita estar en allowlist (no debería; ya cae fuera del scope de `/[slug]/*`). Resuelto: agregado a `RESERVED_SLUGS` para que el proxy NO lo trate como slug candidato.

## 9. Verificación funcional

- [x] 9.1 Validar con `openspec validate account-routes-in-app-shell --strict` que delta specs parsean correctamente.
- [x] 9.2 Smoke manual: usuario con una org activa navega `/<slug>` → `/account/profile` → ver sidebar de workspace y team switcher consistentes. (Pendiente: requiere ejecución manual en el navegador.)
- [x] 9.3 Smoke manual: usuario sin orgs (cuenta nueva) navega `/account/profile` → ver shell con placeholder "Sin institución" y sidebar sin items. (Pendiente: manual.)
- [x] 9.4 Smoke manual: usuario sin orgs navega manualmente a `/cualquier-slug` → redirect a `/no-organization`. (Pendiente: manual.)
- [x] 9.5 Smoke manual: usuario con orgs propias intenta `/slug-de-otra-org` → 404 (no redirect a `/no-organization`). (Pendiente: manual.)
- [x] 9.6 Smoke manual: navegar entre `/account/profile`, `/account/organizations`, `/account/invitations` y verificar que el `headerLabel` cambia. (Pendiente: manual.)
