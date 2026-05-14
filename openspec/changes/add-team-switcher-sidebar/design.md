## Context

`session.activeOrganizationId` es el campo nativo del plugin organization de better-auth para guardar la org activa por sesión. Pero la sesión vive solo en una cookie (TTL ~30 días, atada a un dispositivo). Si el usuario se loguea en otro dispositivo o se le venció la cookie, ese campo arranca en `null` y no hay forma de recuperar la "última org elegida". El requisito del usuario "al autenticarse debe quedar en la última que estuvo activo" implica persistencia a nivel `user`, no `session`.

El proyecto ya tiene `loadActiveMembershipsFor(userId)` que devuelve memberships filtradas por `status='active'`. Falta una función que resuelva qué org elegir como activa al iniciar un layout cuando hay ambigüedad.

## Goals / Non-Goals

**Goals:**
- UI de switch entre orgs visible y descubrible desde el sidebar de los shells admin/app.
- Persistencia "cross-session" de la última org activa.
- Resolución consistente y defensiva de la org activa: nunca quedar apuntando a una org donde el usuario ya no es activo.
- Cero efecto sobre el shell super (los super admins no son members de tenants).

**Non-Goals:**
- URL-based tenant routing (`/[org]/admin/...`). Sigue session-based.
- Crear orgs desde el switcher. Eso sigue siendo flujo separado.
- Mostrar orgs suspendidas en el switcher (ya están en `/account/organizations` con su badge).
- Dialog de confirmación al cambiar de org. Cambio es ligero, sin estado destructivo.

## Decisions

### Decisión 1 — Persistir "última org" en `user.lastActiveOrganizationId`, no en otro lado

**Elegido**: agregar `lastActiveOrganizationId: text` a `user` vía `user.additionalFields` en `betterAuth({ user: { additionalFields: ... } })`.

**Alternativas**:
- Guardar en `localStorage`. Rechazada: no cross-device.
- Tabla `user_preferences` aparte. Sobreingeniería para un solo campo.
- Solo usar `session.activeOrganizationId`. Rechazada: no sobrevive nuevas sesiones.

**Razón**: una columna nullable en `user` es la persistencia mínima que cumple el requisito cross-device. Same pattern que ya usamos para `member.status` (additionalFields).

### Decisión 2 — Resolución de "org activa" en el layout, no en un middleware

**Elegido**: en cada request a `/admin` o `/app`, el layout llama un helper `resolveActiveOrganization(session, memberships)` que devuelve `{ activeOrgId, memberships, allOrgs }`. El helper:

1. Si `session.activeOrganizationId` está seteado Y corresponde a una membership activa → usar ese.
2. Si no, si `user.lastActiveOrganizationId` está seteado Y corresponde a membership activa → restaurar (server action `setActiveOrganization`) y usar ese.
3. Si no, primera membership activa por nombre alfabético → setear y usar.
4. Si no hay memberships activas → redirect a `/account/organizations`.

**Alternativas**: middleware/proxy de Next 16. Rechazada: tendríamos que cargar memberships en el edge en cada request → costo y complejidad.

**Razón**: el layout ya hace esa query, agregar 5 líneas para resolver la elección no impacta el rendimiento. La autoridad sobre "qué org activa" queda donde se usa (el layout que renderiza el shell), no en una capa transversal.

### Decisión 3 — TeamSwitcher reemplaza NavBrand solo en admin/app, no en super

**Elegido**: el componente `<AppSidebar>` recibe una prop opcional `teams?: TeamSwitcherConfig`. Si llega → renderiza `TeamSwitcher`. Si no → renderiza `NavBrand` (estado actual). El layout super NUNCA pasa `teams`; admin y app SIEMPRE lo pasan (cuando hay memberships activas).

**Razón**: super no tiene tenants; mostrar un switcher vacío sería confuso. Mantener la prop opcional permite sumar otros shells sin tocar el componente.

### Decisión 4 — Server action en archivo separado, no inline en layout

**Elegido**: `components/layout/team-switcher-actions.ts` con `switchActiveOrganizationAction(orgId)` exportada como `"use server"`. La importa el componente cliente `team-switcher.tsx`.

**Razón**: el layout es server async; embeber `"use server"` ahí mezcla responsabilidades. Un archivo de actions co-ubicado con el componente cliente es el patrón estándar de Next 16 App Router.

### Decisión 5 — `revalidatePath("/")` + `router.refresh()` después del switch

**Elegido**: la action revalida la raíz para que TODAS las páginas reflejen la nueva org activa al refrescar. El componente cliente además llama `router.refresh()` tras la action exitosa para empujar el cambio sin que el usuario tenga que recargar.

**Razón**: un switch de tenant cambia el contexto global (sidebar, dashboards, queries). Cualquier página que dependa de `session.activeOrganizationId` necesita re-render. `revalidatePath("/")` invalida toda la cache server-side; `router.refresh()` fuerza el re-fetch client-side.

### Decisión 6 — TeamSwitcher solo lista orgs ACTIVAS

**Elegido**: el dropdown muestra solo memberships con `status='active'`. Las suspendidas no aparecen.

**Razón**: el usuario no puede entrar a una org suspendida (el guard la bloquea), así que ofrecérsela como opción es confuso. Si la quiere ver/contactar al admin, va a `/account/organizations`.

## Risks / Trade-offs

- **[Riesgo] Race: usuario cambia de org mientras renderiza otra página → datos mezclados** → Mitigación: `revalidatePath("/")` + `router.refresh()` aseguran consistencia tras el switch. Worst case: una página queda con datos de la org anterior por <1s; ningún dato es modificable cross-tenant en esa ventana porque cada server action revalida sus permisos.
- **[Riesgo] `user.lastActiveOrganizationId` apunta a org borrada** → Mitigación: el helper `resolveActiveOrganization` valida que la org siga existiendo en las memberships activas; si no, cae al fallback.
- **[Riesgo] La regen de `auth.ts` puede borrar el orden esperado de columnas en migraciones futuras** → Aceptado. Drizzle-kit detecta cambios y genera migraciones aditivas; no rompe.
- **[Trade-off] No hay UI para "olvidar última org elegida"** → Aceptado para v1. Si se necesita, basta con setear el campo a null al hacer logout.

## Migration Plan

1. Editar `lib/auth/server.ts` agregando `user.additionalFields.lastActiveOrganizationId`.
2. `npm run db:generate-auth-schema` (con el workaround de comentar `server-only` documentado en el change anterior).
3. `npm run db:generate` → migración SQL.
4. `npm run db:push` (dev) o `npm run db:migrate` (prod).
5. Deploy del código.

Rollback: el campo es nullable y aditivo. Drop column si necesario, sin pérdida.
