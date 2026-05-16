# Archive Report — fix-auth-redirect-loops

**Archived**: 2026-05-16
**Schema**: spec-driven (manual archive — openspec CLI rejects date-prefixed change names)

## Summary

Patched two production-of-dev redirect bugs by routing decisions to **rol-en-org-activa** instead of the global membership set, and by removing the `super_admin → /super` hard redirect from `/(app)/layout.tsx` and `/admin/layout.tsx`.

Bugs resolved:

1. **Infinite redirect loop** when a user is `admin/owner` in one org and `member` in another, with the active org being the one where they're a member. Layouts decided based on `memberships.some(admin)` while pages decided based on `requireOrgAdmin()` against the active org → bounce-loop.
2. **`super_admin` blocked from invited orgs**. Layouts forced `/super` regardless of membership.

Both fixes ship without touching URLs or schema, fully reversible.

## Spec sync

| Spec | Capability | Result |
|------|------------|--------|
| `route-protection/spec.md` | Modified `Requirement: Layout RSC es la verdad para render` (added rol-en-org-activa rules + 4 new scenarios) | ✅ Synced |
| `auth-roles/spec.md` | Modified `Requirement: Cálculo de dashboardHref según rol` (added `activeOrgRole`-aware branch + 7 scenarios) | ✅ Synced |

## Files changed

- `next-app/lib/auth/guards.ts` — `ResolveActiveOrgResult` exposes `activeOrgRole`; `redirectToDashboard()` rewritten.
- `next-app/lib/auth/derive-dashboard-href.ts` — accepts optional `activeOrgRole`; legacy branch preserved.
- `next-app/app/(app)/layout.tsx` — removed super_admin shortcut; admin redirect uses `activeOrgRole`.
- `next-app/app/admin/layout.tsx` — removed super_admin shortcut; non-admin fallback delegates to `redirectToDashboard()`.
- `next-app/lib/auth/__tests__/derive-dashboard-href.test.ts` — new (vitest convention; runner not yet installed).

## Task 8.2 — código muerto para change 2

Una vez que `2026-05-16-introduce-platform-organization` garantice (vía seed/hook) que **todo `super_admin` tiene al menos una membresía activa en la org plataforma**, las siguientes ramas de código quedan **inalcanzables** y pueden eliminarse en ese change:

### En `next-app/lib/auth/guards.ts` → `redirectToDashboard()`

```ts
if (session.user.role === "super_admin" && activeOrgRole === null) {
  redirect("/super");
}
```

Razón: `activeOrgRole === null` requiere `activeOrgs.length === 0`, lo cual no puede ocurrir si todo super tiene membresía garantizada en la org plataforma. El change 2 puede colapsar esta rama, dejando el algoritmo final como:

1. `activeOrgRole === null` → `/account/organizations` (rama defensiva para usuarios regulares)
2. `activeOrgRole ∈ {owner, admin}` → `/admin`
3. else → `/app`

### En `next-app/lib/auth/derive-dashboard-href.ts` → `deriveDashboardHref()`

```ts
if (activeOrgRole === null) {
  return role === "super_admin" ? "/super" : "/account/organizations";
}
```

Razón: misma — el caller que pasa `activeOrgRole` no podrá recibir `null` para un super. Simplificable a:

```ts
if (activeOrgRole === null) return "/account/organizations";
```

### Pre-condición a documentar en el change 2

> **Invariante post-seed**: `user.role === "super_admin"` implica `member` row con `status === "active"` en la org plataforma. El código de redirect puede asumir `activeOrgRole !== null` para todo super.

## Manual verification scenarios (tarea 7.1–7.4)

Marcados como ejecutados por el operador humano antes del archive. Documentados para reproducir:

1. **Admin+member loop**: user con `[{orgA, admin}, {orgB, member}]`, activeOrg = B → debe terminar en `/app` sin redirects intermedios (devtools Network: sin chain `/admin → /app → /admin`).
2. **Super invitado a org**: super con `member.role === "admin"` en X, activeOrg = X → entra a `/admin`; `/super` sigue accesible.
3. **Super sin memberships**: → `/super` (regresión protegida).
4. **Usuario regular sin memberships**: → `/account/organizations`.

## Hand-off al change 2

- `redirectToDashboard()` queda tolerante al caso "super con membresías" — el change 2 NO necesita reescribirla, solo eliminar la rama muerta listada arriba.
- `proposal.md` del change 2 (líneas 13–19) sigue describiendo correctamente el estado del codebase.
- No hay cambios de schema ni migraciones en este change.
