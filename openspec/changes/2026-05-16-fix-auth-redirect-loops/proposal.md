## Chain context

Este change es **el primero de una cadena de tres** que rediseña el modelo de autenticación y layout de Docentix. La cadena nace de dos bugs observados en producción de dev y de una decisión arquitectónica posterior de adoptar el patrón estándar de la industria (Vercel/Linear/Notion) para multi-tenant.

| # | Change | Estado al cerrar |
|---|--------|------------------|
| **1 (este)** | `2026-05-16-fix-auth-redirect-loops` | Bugs de redirect parchados sobre el modelo actual. URLs siguen siendo `/app`, `/admin`, `/super`. `super_admin` SIGUE sin pertenecer a orgs. |
| 2 | `2026-05-16-introduce-platform-organization` | `super_admin` pasa a ser miembro `owner` de una org plataforma. `/super` deja de ser un dashboard y se vuelve panel de staff. Reset de migraciones. |
| 3 | `2026-05-16-slug-scoped-workspace-routes` | Rutas `/app/*` y `/admin/*` migran a `/[slug]/*` y `/[slug]/admin/*`. Shell unificado en componente `AppShell`. |

**Relación con el siguiente change**: la lógica de redirect que este change introduce (basada en rol-en-org-activa) es la misma que el change 2 mantiene; el change 2 solo cambia *quién* puede ser `super_admin` (alguien con membresías) y no *cómo* se calcula el dashboard. El change 3 elimina por completo la decisión "a qué URL voy" porque la URL pasa a contener el slug.

**Alternativa válida**: si el equipo decide ir directo al refactor grande, este change 1 se puede saltar — el change 2 incluye los mismos arreglos como efecto colateral. Mantenerlo separado tiene sentido solo si querés un fix-merge rápido a `dev` antes de empezar el refactor.

**Para retomar en una sesión nueva**: leé este archivo + `tasks.md`. No hay dependencias previas. Verificá con `openspec list --json` que ningún change posterior de la cadena fue archivado todavía (si lo fue, este change ya no aplica).

---

## Why

Hay dos bugs de redirect que bloquean a usuarios reales hoy:

1. **Loop infinito al autenticarse cuando un usuario tiene `admin/owner` en una org y `member` en otra**. La causa raíz es que los layouts (`/(app)/layout.tsx`, `/admin/layout.tsx`) deciden a qué URL mandar al usuario mirando "soy admin en *alguna* org" (`memberships.some`), pero las páginas internas (`/admin/page.tsx`, `/(app)/app/page.tsx`) deciden si la persona puede estar ahí mirando "soy admin en la org *activa*" (`requireOrgAdmin()`). Cuando la org activa es una donde el usuario es `member` pero también es admin de otra org, el layout lo manda a `/admin` y la página lo rebota a `/app`, que el layout vuelve a redirigir a `/admin`. Ciclo.

2. **Bloqueo total de `super_admin` invitado a una org**. `/(app)/layout.tsx:38` y `/admin/layout.tsx:38` redirigen `super_admin` a `/super` sin condiciones, y `redirectToDashboard()` en `lib/auth/guards.ts:209` hace lo mismo. Un super con membresía no puede acceder a ninguna org porque cualquier ruta de workspace lo expulsa a `/super`.

La causa raíz común es **acoplar la decisión de routing al conjunto global de membresías del usuario en vez de a su rol en la org activa**, sumado a tratar `super_admin` como un *modo exclusivo* (en vez de una *capacidad adicional*). Este change corrige ambas cosas con cirugía mínima, sin tocar URLs ni el modelo de datos.

## What Changes

- Refactorizar `redirectToDashboard()` en `lib/auth/guards.ts` para que decida el destino en función del **rol en la organización activa resuelta**, no del set global de membresías. Si no hay org activa resoluble, dirige a `/account/organizations`.
- Eliminar el redirect forzoso `super_admin → /super` de los layouts `/(app)/layout.tsx` y `/admin/layout.tsx`. Un `super_admin` con membresía activa SHALL poder navegar el workspace de esa org. El acceso a `/super` queda gated únicamente por `user.role === "super_admin"` en `/super/(protected)/layout.tsx` (ya existe).
- Ajustar `redirectToDashboard()` para que un `super_admin` SIN ninguna membresía siga yendo a `/super`. La condición pasa a ser "si es super_admin Y no tiene memberships activas, → `/super`; si tiene memberships, decide por rol-en-org-activa como cualquier otro usuario".
- Cambiar el redirect en `/admin/layout.tsx` cuando el usuario NO es admin en la org activa: antes redirigía a `/app` confiando en que el otro layout no rebotaría — ahora `/admin` redirige al destino calculado por `redirectToDashboard()` para evitar cualquier riesgo de loop.
- Refactorizar el "isTenantAdmin" en `/(app)/layout.tsx` y `/admin/layout.tsx` para mirar el rol en la **org activa** (post-resolución) y no `memberships.some`. La función `resolveActiveOrganization` ya retorna la org activa; agregar a ese resultado el rol del usuario en ella.
- Modificar `deriveDashboardHref` en `lib/auth/derive-dashboard-href.ts` para aceptar opcionalmente el rol-en-org-activa cuando el caller ya lo conoce, manteniendo backwards-compat con el caller actual (`/account/layout.tsx`).
- Tests unitarios para `redirectToDashboard()` y `deriveDashboardHref()` cubriendo los 4 escenarios críticos: (a) super sin membresías, (b) super con membresía admin, (c) usuario admin+member en orgs distintas con org activa member, (d) usuario admin+member con org activa admin.

## Capabilities

### Modified Capabilities

- `route-protection`: la regla de qué redirect aplica cada layout protegido pasa de "rol global del usuario + alguna membresía admin" a "rol-en-org-activa". El layout de `/super` no se modifica.
- `auth-roles`: el cálculo de `dashboardHref` pasa a depender del rol del usuario en la org activa resuelta. `super_admin` deja de ser tratado como destino único: si tiene memberships, accede al workspace como cualquier usuario.

### Out of scope

- NO se modifican URLs (`/app`, `/admin`, `/super` siguen igual).
- NO se modifica `super_admin SHALL NOT tener registros en member` (eso lo cambia el change 2).
- NO se unifica el shell ni se crea `AppShell` (eso lo hace el change 3).
- NO se introduce slug en las URLs (change 3).

## Impact

- **Código modificado**:
  - `next-app/lib/auth/guards.ts` — `redirectToDashboard`, posible helper nuevo `resolveActiveOrgWithRole`.
  - `next-app/lib/auth/derive-dashboard-href.ts` — firma opcionalmente acepta `activeOrgRole`.
  - `next-app/app/(app)/layout.tsx` — quitar redirect super, cambiar criterio admin.
  - `next-app/app/admin/layout.tsx` — quitar redirect super, cambiar criterio admin, redirigir vía `redirectToDashboard` si no es admin en org activa.
- **Tests nuevos**:
  - `next-app/lib/auth/__tests__/guards.test.ts` o equivalente para `redirectToDashboard`.
  - `next-app/lib/auth/__tests__/derive-dashboard-href.test.ts`.
- **Schema DB**: sin cambios.
- **Migraciones**: ninguna.
- **Specs afectadas (deltas)**:
  - `route-protection` — MODIFIED (regla de redirect del layout).
  - `auth-roles` — MODIFIED (algoritmo de `deriveDashboardHref`).
- **Riesgo**: bajo. Cambio aislado en lógica de redirect. Reversible con un revert si se descubre un escenario no cubierto.
- **Hand-off para el change 2**: este change deja `redirectToDashboard()` ya tolerante al caso "super con membresías". Esa misma función se queda como está en el change 2; solo el seed de la migración garantiza que TODO super tenga membresías, eliminando la rama "super sin memberships → /super" como código muerto que el change 2 puede limpiar al final.
