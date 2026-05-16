# Tasks — fix-auth-redirect-loops

## 0. Preparación

- [ ] 0.1 Leer `proposal.md` completo, incluido el bloque "Chain context"
- [ ] 0.2 Confirmar con `openspec list --json` que ningún change posterior de la cadena fue archivado todavía. Si `2026-05-16-introduce-platform-organization` ya está archivado, este change ya no aplica — STOP.
- [ ] 0.3 Leer estado actual de `next-app/lib/auth/guards.ts`, `next-app/lib/auth/derive-dashboard-href.ts`, `next-app/app/(app)/layout.tsx`, `next-app/app/admin/layout.tsx`

## 1. Helper de resolución con rol

- [ ] 1.1 Extender `resolveActiveOrganization` en `lib/auth/guards.ts` para que devuelva también `role: "owner" | "admin" | "member" | null`. El rol sale del `activeOrgs[]` que ya recibe (cada item ya trae `role`). Nuevo nombre del resultado: `{ activeOrgId, activeOrgRole, needsPersist }`. Mantener firma de entrada.
- [ ] 1.2 Buscar todos los call sites de `resolveActiveOrganization` (`Grep`) y actualizar destructuring. Sitios esperados: `app/(app)/layout.tsx`, `app/admin/layout.tsx`.

## 2. `redirectToDashboard` basado en rol-en-org-activa

- [ ] 2.1 Reescribir `redirectToDashboard()` en `lib/auth/guards.ts`. Algoritmo nuevo:
  1. Si no hay sesión → `redirect("/login")`.
  2. Cargar memberships activas y orgs activas (helpers ya existen).
  3. Resolver org activa con el helper extendido en 1.1.
  4. Si el usuario es `super_admin` Y `activeOrgRole === null` (sin memberships) → `redirect("/super")`.
  5. Si `activeOrgRole === null` (no super, sin memberships) → `redirect("/account/organizations")`.
  6. Si `activeOrgRole ∈ {"owner", "admin"}` → `redirect("/admin")`.
  7. En cualquier otro caso → `redirect("/app")`.
- [ ] 2.2 Quitar el `if (session.user.role === "super_admin") redirect("/super")` que existe al inicio de la función. Esa regla queda subsumida por el paso 4.

## 3. `deriveDashboardHref` consciente del rol-en-org-activa

- [ ] 3.1 Ampliar el tipo `SessionRoleData` en `lib/auth/derive-dashboard-href.ts` agregando un campo opcional `activeOrgRole?: "owner" | "admin" | "member" | null`.
- [ ] 3.2 Modificar el algoritmo de `deriveDashboardHref(data)`:
  - Si `activeOrgRole` está provisto y es `null` Y `user.role === "super_admin"` → `/super`.
  - Si `activeOrgRole === "owner"` o `"admin"` → `/admin`.
  - Si `activeOrgRole === "member"` → `/app`.
  - Si `activeOrgRole` NO está provisto, mantener comportamiento legacy: `super_admin → /super`, sino chequear `memberships.some(admin|owner)`.
- [ ] 3.3 Verificar que el único caller actual (`app/account/layout.tsx`) sigue funcionando sin cambios.

## 4. Layout `/(app)` — quitar redirect super y usar rol-en-org-activa

- [ ] 4.1 En `app/(app)/layout.tsx`, eliminar el bloque `if (session.user.role === "super_admin") { redirect("/super"); }`.
- [ ] 4.2 Reemplazar la línea `const isTenantAdmin = memberships.some(...)` por el `activeOrgRole` que ahora retorna `resolveActiveOrganization`.
- [ ] 4.3 Reemplazar `if (isTenantAdmin) redirect("/admin");` por `if (activeOrgRole === "owner" || activeOrgRole === "admin") redirect("/admin");`.
- [ ] 4.4 Si `activeOrgRole === null` (sin memberships activas), seguir redirigiendo a `/account/organizations`.

## 5. Layout `/admin` — quitar redirect super y endurecer fallback

- [ ] 5.1 En `app/admin/layout.tsx`, eliminar el bloque `if (session.user.role === "super_admin") { redirect("/super"); }`.
- [ ] 5.2 Reemplazar `const isAdmin = memberships.some(...)` por el `activeOrgRole` que ahora retorna `resolveActiveOrganization`.
- [ ] 5.3 Reemplazar `if (!isAdmin) redirect("/app");` por: si `activeOrgRole !== "owner" && activeOrgRole !== "admin"`, invocar `await redirectToDashboard()`. Esto rompe cualquier loop futuro porque el destino lo calcula la única función-fuente-de-verdad.

## 6. Tests

- [ ] 6.1 Crear `next-app/lib/auth/__tests__/derive-dashboard-href.test.ts` con casos:
  - super sin `activeOrgRole` → `/super`
  - super con `activeOrgRole === "member"` → `/app`
  - super con `activeOrgRole === "admin"` → `/admin`
  - user con `activeOrgRole === "admin"` → `/admin`
  - user con `activeOrgRole === "member"` → `/app`
  - user sin `activeOrgRole` y sin memberships → `/app` (fallback legacy)
- [ ] 6.2 Documentar (no ejecutar) escenarios E2E manuales para `redirectToDashboard()` que dependen de DB:
  - Caso loop: usuario admin en org A, member en org B, activeOrg = B → debe terminar en `/app` sin redirects intermedios extra.
  - Caso super invitado: super con `member.role = "admin"` en org X, activeOrg = X → debe entrar a `/admin` sin redirect a `/super`.

## 7. Validación

- [ ] 7.1 Login manual del escenario admin+member: verificar URL final estable y sin recursión de redirects (red de devtools).
- [ ] 7.2 Login manual del escenario super invitado a org: verificar acceso a `/admin` o `/app` según rol-en-org, y verificar que `/super` sigue accesible.
- [ ] 7.3 Login manual de un super sin memberships: verificar que sigue cayendo en `/super` como antes.
- [ ] 7.4 Login manual de un usuario regular sin memberships: verificar `/account/organizations`.

## 8. Hand-off al change 2

- [ ] 8.1 En `proposal.md` del change `2026-05-16-introduce-platform-organization`, confirmar que la sección "Codebase assumptions at start" todavía coincide con el estado real (descripciones de `redirectToDashboard` y layouts).
- [ ] 8.2 Anotar en el `archive-report` de este change qué rama de `redirectToDashboard` queda como código muerto una vez que el change 2 garantice que todo super tiene membresía (la rama "super_admin && activeOrgRole === null → /super").
