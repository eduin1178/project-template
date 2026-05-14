## Why

Hoy un admin (o owner) de una organización **no puede** gestionar a sus miembros una vez que entraron: no puede cambiar el rol entre `admin`/`member`, ni puede pausar el acceso de un miembro a la organización sin eliminarlo (perdiendo el historial). Las dos capacidades son básicas para administrar un tenant en producción y son lo primero que un admin pide cuando alguien cambia de función o deja temporalmente de necesitar acceso.

Combinamos ambas en un solo change porque comparten exactamente:
- el actor (admin/owner del propio tenant — no el super admin),
- la superficie de UI (la fila del miembro en `MembersTable`),
- el archivo de server actions (`app/account/organizations/[id]/actions.ts`),
- el guard (`requireTenantAdminFor`).

Partirlo en dos PRs implicaría tocar `members-table.tsx` y el archivo de actions dos veces, agregando ruido sin valor para el reviewer.

## What Changes

### Schema

- Agregar columna `status` a la tabla `member` vía `additionalFields` del plugin `organization` de better-auth (en `lib/auth/server.ts`). Valores: `active` (default) | `inactive`. Se regenera `lib/db/schema/auth.ts` con `npm run db:generate-auth-schema` y se aplica con `npm run db:push`.

### Server actions (en `app/account/organizations/[id]/actions.ts`)

- `updateMemberRoleAction({ memberId, role })` — admin/owner cambia el rol de otro miembro entre `admin` ↔ `member`.
  - Reglas: actor debe ser admin/owner de la org; no puede modificar su propio rol; si el target es el último `admin`/`owner` activo, no se permite degradarlo.
- `setMemberStatusAction({ memberId, status })` — admin/owner pausa o reactiva el acceso de un miembro a la org.
  - Reglas: actor debe ser admin/owner de la org; no puede modificar su propio status; si el target es el último admin/owner **activo** y la operación es `inactive`, se rechaza.

### Runtime / guards

- Nuevo helper `loadActiveMembershipsFor(userId)` en `lib/auth/guards.ts` que filtra por `status = 'active'`. Mantener `loadMembershipsFor` (sin filtro) para usos administrativos.
- Reemplazar las llamadas existentes de `loadMembershipsFor` en los layouts y `redirectToDashboard` por `loadActiveMembershipsFor` para que los miembros inactivos no entren a `/admin` ni `/app`.
- `requireTenantAdminFor` (en `app/account/organizations/[id]/actions.ts`) debe exigir `status = 'active'` (un admin inactivado pierde sus poderes en esa org).
- Página de suspensión `/account/suspended?org=<id>` que se muestra cuando el usuario tiene `session.activeOrganizationId` apuntando a una org donde su membership está inactiva. Mensaje: "Tu acceso a {org} fue suspendido. Contacta al administrador." y botón para volver a `/account/organizations` (que listará SOLO orgs activas — las inactivas pueden marcarse con badge "Suspendida").

### UI

- `components/organizations/members-table.tsx`: agregar columna "Estado" (badge `Activo`/`Suspendido`) y columna "Acciones" con dropdown por fila (sólo cuando se rendere con `canManage`). El dropdown ofrece:
  - "Cambiar a admin" / "Cambiar a miembro" según rol actual (deshabilitado si target es self o si bloquearía la regla "último admin").
  - "Suspender acceso" / "Reactivar acceso" según status (deshabilitado si target es self o regla "último admin activo").
  - Confirmación inline (AlertDialog) para acciones destructivas (suspender, degradar a member).
- Plumbing del prop `canManage` desde `app/account/organizations/[id]/page.tsx` (true cuando viewer es admin/owner). El render desde `app/super/(protected)/organizations/[id]/page.tsx` sigue **sin** acciones (super no gestiona miembros desde su panel — esa decisión la confirmó el usuario).

## Capabilities

### New Capabilities
<!-- Ninguna nueva en sentido de capability OpenSpec — todo va en account-organizations. -->

### Modified Capabilities

- `account-organizations`: se agregan los requisitos de gestión de rol y de estado de miembros por parte del admin/owner del tenant.

## Impact

- **Schema**: nueva columna `member.status` (text, default `'active'`, not null). Migración Drizzle generada y aplicada.
- **Código afectado** (~10 archivos):
  - `lib/auth/server.ts` (config de plugin organization)
  - `lib/db/schema/auth.ts` (regenerado por better-auth CLI)
  - `lib/auth/guards.ts` (helper + cambios de filtro)
  - `app/admin/layout.tsx`, `app/app/layout.tsx`, `lib/auth/guards.ts::redirectToDashboard` (usar active filter)
  - `app/account/organizations/[id]/actions.ts` (2 server actions nuevas + endurecimiento de `requireTenantAdminFor`)
  - `app/account/organizations/[id]/page.tsx` (plumbing canManage + currentUserId)
  - `app/account/organizations/page.tsx` (filtro/badge para orgs inactivas)
  - `app/account/suspended/page.tsx` (nueva, página de suspensión)
  - `components/organizations/members-table.tsx` (columnas estado + acciones)
- **Sin breaking para usuarios actuales**: todos los miembros existentes quedan con `status='active'` por default.
- **Migración local**: `npm run db:generate-auth-schema && npm run db:push` tras merge.
