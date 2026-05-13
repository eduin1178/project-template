## Why

El super_admin necesita gestionar el ciclo de vida de las organizaciones (tenants) y de sus administradores desde `/super`. Hoy el panel sólo tiene un dashboard mínimo con CTA para invitar otros super_admins; no permite crear orgs, invitar al admin de cada una, ni inspeccionar miembros e invitaciones por org. Sin esto el modelo multi-tenant no es operable end-to-end.

## What Changes

- **Sidebar shell reutilizable**: `AppSidebar` en `components/layout/` basado en el block `sidebar-07` de shadcn, parametrizado por config (brand, items, user). Se ensambla en `/super`, `/admin` y `/app` (estos dos con stubs mínimos).
- **Vista de Organizaciones en `/super`**: lista con empty-state, botón "Nueva organización", form que crea org **y** envía invitación al email del admin en la misma acción.
- **Detalle de organización `/super/organizations/[id]`**: tabs "Miembros" e "Invitaciones" leyendo las tablas nativas `member` e `invitation` del plugin `organization`. Acciones por invitación: copiar link, reenviar, eliminar (sólo `pending`).
- **Invitación de admin de org**: flujo nativo de better-auth. El super_admin (vía plugin `admin` con `adminRoles: ["super_admin"]`) crea la invitación con `role = "admin"` sin ser miembro. Token/ID nativo, sin tabla propia.
- **Aceptación nativa en `/accept-invitation`**: ruta pública que resuelve `invitationId` contra el plugin `organization`. Soporta usuarios nuevos (signup email/password o Google) y existentes; aceptación atómica que crea `member` con `role = "admin"`.
- **BREAKING** — **Renombre de la ruta de aceptación super**: `/accept-invitation` → `/super/accept-invitation`. Libera `/accept-invitation` para el flujo nativo (admins de org en esta fase; miembros en fases posteriores).
- **Route group público dentro de `/super`**: `app/super/(public)/accept-invitation/` queda exento del guard de rol; el resto vive bajo `(protected)`.
- **Primitiva `EmptyState`** en `components/ui/empty-state.tsx`, reutilizable (props `icon`, `title`, `description`, `action`).
- **Email template** para invitación de admin de org (similar al de super-invitation, distinto copy y link).

## Capabilities

### New Capabilities

- `super-organizations`: CRUD de organizaciones desde `/super` (lista, crear, ver detalle con miembros e invitaciones).
- `super-org-invitations`: ciclo de vida de invitaciones de admin de org disparadas por super_admin (crear, copiar link, reenviar, eliminar pending) y aceptación nativa vía plugin `organization`.

### Modified Capabilities

- `super-panel`: el layout adopta `AppSidebar` con route groups `(protected)`/`(public)`; `/super` redirige por defecto al listado de organizaciones; se mantiene el CTA de invitar super_admin pero migra a su propio menú/vista (no bloqueante para esta fase).
- `super-invitations`: la ruta de aceptación pasa de `/accept-invitation` a `/super/accept-invitation`; emails y referencias se actualizan.
- `route-protection`: el guard reconoce el route group `(public)` dentro de `/super` como excepción a la verificación de rol `super_admin`.
- `ui-foundation`: añade `AppSidebar` (shell reutilizable) y `EmptyState` (primitiva).

## Impact

- **Código nuevo**:
  - `components/layout/app-sidebar.tsx` + tipos de config.
  - `components/ui/empty-state.tsx`.
  - `app/super/(protected)/layout.tsx`, `app/super/(protected)/page.tsx` (redirige a organizations), `app/super/(protected)/organizations/page.tsx`, `app/super/(protected)/organizations/new/...`, `app/super/(protected)/organizations/[id]/page.tsx`.
  - `app/super/(public)/accept-invitation/page.tsx` (mueve la actual).
  - `app/accept-invitation/page.tsx` (nuevo, flujo nativo).
  - Server actions: `createOrganizationWithAdmin`, `resendOrgInvitation`, `deleteOrgInvitation`, `acceptOrgInvitation`.
- **Código modificado**:
  - `app/super/layout.tsx` se reestructura en route groups.
  - Email templates: nuevo template para org-admin invitation; rename/ajuste del de super.
  - `lib/email/*` (sender) gana un nuevo caller.
- **Dependencias**:
  - `npx shadcn@latest add sidebar-07` (instala `sidebar`, `breadcrumb`, `collapsible`, `dropdown-menu` si no están).
  - Posible verificación en design de que `auth.api.createInvitation` acepta llamadas de super_admin vía elevación del plugin `admin`; fallback documentado.
- **Sin cambios** en `auth-roles`, `super-setup`, `auth`, `auth-status-contract`, `db-foundation`, `landing-page`.
- **Datos**: no se crean tablas nuevas. Se usan `organization`, `member`, `invitation` existentes del plugin.
