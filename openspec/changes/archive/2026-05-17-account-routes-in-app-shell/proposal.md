## Why

Las rutas `/account/profile`, `/account/organizations` y `/account/invitations` se renderizan hoy en un layout minimal propio (header con "Volver al panel"), fuera del `AppShell` principal donde viven los dashboards y la mensajería. La transición entre "mi workspace" y "mi cuenta" se siente como entrar a otra aplicación: pierde el sidebar, el team switcher, el menú del avatar y el contexto visual de la institución activa. La navegación a estas páginas ya existe en el dropdown del avatar (`NavUser`); lo único que falta es que el destino mantenga el shell.

Aprovechamos para cerrar un borde suelto del routing org-scoped: hoy, si un usuario sin ninguna organización activa aterriza en `/[slug]/*`, el layout responde con `notFound()`, dejando una pantalla 404 sin contexto sobre por qué no puede entrar.

## What Changes

- `/account/*` se renderiza dentro del `AppShell` (mismo shell que `/[slug]/(member)/*` y `/super/(protected)/*`).
- Resolución de organización activa en cascada dentro del layout de cuenta: `session.activeOrganizationId` → `user.lastActiveOrganizationId` → primera org activa del usuario → `null`.
- `TeamSwitcher` soporta estado "sin institución": cuando no hay org resuelta, renderiza un placeholder no-interactivo ("Sin institución") y la lista de opciones queda vacía.
- `AppSidebar` acepta `sidebarConfig` sin items de workspace (solo brand + user menu) para el caso "sin org".
- `headerLabel` del shell de cuenta es dinámico por subpágina ("Perfil" / "Mis instituciones" / "Mis invitaciones"), resuelto en un client component que observa `usePathname()`.
- Nueva ruta `/no-organization`: página informativa que explica al usuario que no pertenece a ninguna institución, con CTA a `/account/invitations`.
- **BREAKING (UX)**: Layouts de `/[slug]/*` y `/[slug]/admin/*` dejan de responder con `notFound()` cuando el usuario tiene cero orgs activas y aterriza en una ruta de workspace; en su lugar redirigen a `/no-organization`. La respuesta a "slug no existe" o "no soy miembro de ESA org específica" sigue siendo `notFound()`.
- El layout minimal anterior de `/account/*` deja de existir; se reemplaza por el shell. La barra "Volver al panel" desaparece (la navegación de regreso al workspace pasa a darse vía sidebar/brand link o team switcher).

## Capabilities

### New Capabilities
- `no-organization-page`: ruta informativa `/no-organization` que se muestra cuando un usuario sin orgs activas intenta acceder a contenido org-scoped, con CTA a invitaciones.

### Modified Capabilities
- `account-shell`: el shell de las rutas de cuenta cambia de un layout minimal a `AppShell` con resolución de org en cascada, soporte para estado "sin institución" y `headerLabel` dinámico por pathname.
- `app-shell`: `TeamSwitcher` y `AppSidebar` aceptan el caso "sin org activa" sin romper (placeholder en el switcher, sidebar sin items de workspace).
- `route-protection`: el contrato de protección de `/[slug]/*` agrega un nuevo terminal: cuando el usuario está autenticado pero no tiene ninguna org activa, redirige a `/no-organization` en lugar de `notFound()`.

## Impact

**Código afectado:**
- `next-app/app/account/layout.tsx` — reescritura completa para usar `AppShell`.
- `next-app/app/no-organization/page.tsx` — nuevo (página + textos).
- `next-app/app/[slug]/layout.tsx` y `next-app/app/[slug]/(member)/layout.tsx` (y admin si aplica) — agregar branch "cero orgs activas → redirect `/no-organization`" antes del `notFound()`.
- `next-app/components/layout/team-switcher.tsx` — soportar `activeOrgId = null` y `orgs = []` con placeholder.
- `next-app/components/layout/app-sidebar.tsx` (o consumidor del `SidebarConfig`) — permitir `items: []`.
- `next-app/components/layout/contexts/account.ts` — nuevo: `buildAccountSidebarConfig(activeOrgSlug | null)`.
- Nuevo client component (p.ej. `next-app/components/layout/account-header-label.tsx`) que resuelve el título por `usePathname()`.

**Sin cambios:**
- `NavUser` (dropdown del avatar) — ya contiene los links a `/account/*`.
- Routing y guards de `/super/*`.
- Rutas y server actions de las páginas de cuenta (`profile`, `organizations`, `invitations`).
- Copy / contenido funcional de las páginas de cuenta (solo cambia el chrome alrededor).

**Riesgos:**
- Estados sutiles donde el shell se renderiza con datos parciales (p. ej. el usuario tiene memberships pero todas están `inactive`); la cascada debe filtrar por status activo de forma consistente con `loadActiveOrganizationsFor`.
- Pérdida del link "Volver al panel" puede confundir a usuarios acostumbrados al layout actual; el brand del sidebar (clickable, lleva a `/<slug>`) cumple esa función pero requiere que el slug esté resuelto.
