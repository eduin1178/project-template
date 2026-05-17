## MODIFIED Requirements

### Requirement: Layout compartido `/account/*`

El sistema SHALL exponer `app/account/layout.tsx` que envuelva todas las rutas bajo `/account/*` renderizándolas dentro de `AppShell`. El layout SHALL:

(a) Requerir sesión (redirige a `/login` si no la hay).

(b) Cargar memberships activas y orgs activas del usuario, y resolver el contexto de organización en cascada determinística:
1. `session.activeOrganizationId` si corresponde a una membership activa
2. `user.lastActiveOrganizationId` si corresponde a una membership activa
3. Primera membership activa ordenada por `organization.name` ASC
4. `null` cuando el usuario tiene cero memberships activas

(c) Renderizar `<AppShell>` pasando:
- `sidebarConfig` construido por `buildAppSidebarConfig(activeOrgSlug)` cuando hay org resuelta, o por `buildAccountFallbackSidebarConfig()` (items vacíos, brand → `/account/profile`) cuando no la hay.
- `user` con `name`, `email`, `image` desde `session.user`.
- `role` derivado por `deriveMenuRole(session, memberships)`.
- `teams` con `{ orgs, activeOrgId, onSwitch: switchActiveOrganizationAction }` cuando hay al menos una org activa, o `{ orgs: [], activeOrgId: null, onSwitch: switchActiveOrganizationAction }` cuando hay cero.
- `headerLabel` con un client component `<AccountHeaderLabel />` que resuelve el título por `usePathname()`: `/account/profile` → "Perfil", `/account/organizations` (y sub-rutas) → "Mis instituciones", `/account/invitations` → "Mis invitaciones", default → "Mi cuenta".

(d) NO renderizar el header propio anterior (con "Volver al panel"): esa navegación se cubre por el brand del sidebar y el `TeamSwitcher`.

#### Scenario: Acceso sin sesión
- **WHEN** un visitante sin cookie de sesión navega a `/account/*`
- **THEN** el layout redirige a `/login`

#### Scenario: Usuario con org activa
- **WHEN** un usuario con una membership activa en la org `acme` (activeOrg en sesión) navega a `/account/profile`
- **THEN** se renderiza `AppShell` con sidebar de workspace `acme`, `TeamSwitcher` mostrando `acme`, y `headerLabel = "Perfil"`

#### Scenario: Usuario con orgs pero sin activeOrg en sesión
- **WHEN** un usuario con `session.activeOrganizationId = null` pero con `user.lastActiveOrganizationId = X` (membership activa) navega a `/account/organizations`
- **THEN** se renderiza `AppShell` con sidebar construido para el slug de X y `headerLabel = "Mis instituciones"`

#### Scenario: Cero orgs activas
- **WHEN** un usuario sin ninguna membership activa navega a `/account/profile`
- **THEN** se renderiza `AppShell` con sidebar usando `buildAccountFallbackSidebarConfig()` (sin items de workspace), `TeamSwitcher` en estado "Sin institución" y `headerLabel = "Perfil"`

#### Scenario: Header label dinámico por subpágina
- **WHEN** el usuario navega entre `/account/profile`, `/account/organizations` y `/account/invitations`
- **THEN** el componente `<AccountHeaderLabel />` muestra "Perfil", "Mis instituciones" y "Mis invitaciones" respectivamente sin requerir cambio en `page.tsx`

## REMOVED Requirements

### Requirement: Layout compartido `/account/*` con header "Mi cuenta" y enlace "Volver al panel"
**Reason**: El layout de cuenta pasa a renderizarse dentro de `AppShell` (mismo shell que workspace member/admin y panel super), eliminando el header propio con el link "Volver al panel". La navegación de regreso al workspace se cubre por el brand del sidebar (clickable a `/<slug>`) y el `TeamSwitcher`. Los escenarios "Volver al panel correcto/admin/user" desaparecen porque ese link ya no existe.
**Migration**: El nuevo requirement "Layout compartido `/account/*`" (sección MODIFIED) describe el nuevo contrato. Usuarios que tenían bookmarks profundos a `/account/*` no se ven afectados (rutas y navegación de cuenta siguen funcionando vía `NavUser` y URLs directas).
