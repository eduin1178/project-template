## ADDED Requirements

### Requirement: Ruta `/no-organization` informa al usuario sin instituciones

El sistema SHALL exponer la ruta `app/no-organization/page.tsx` que se renderiza cuando un usuario autenticado no pertenece a ninguna institución activa y aterriza en contenido org-scoped. La página SHALL:

1. Requerir sesión (redirigir a `/login?next=/no-organization` si no la hay).
2. Verificar que el usuario tenga CERO memberships activas; si tiene al menos una, SHALL redirigir a `/post-login` para que el resolver lo lleve a su dashboard.
3. Renderizar copy explicativo en español neutro (sin voseo) que indique que el usuario no pertenece a ninguna institución y qué puede hacer al respecto.
4. Renderizar un CTA primario "Ver mis invitaciones" que enlaza a `/account/invitations`.
5. Renderizar un link secundario "Ir a mi perfil" que enlaza a `/account/profile`.
6. Renderizarse dentro de `AppShell` con `headerLabel = "Sin institución"`, `TeamSwitcher` en estado placeholder, y sidebar sin items de workspace.

#### Scenario: Usuario sin orgs ve la página
- **WHEN** un usuario autenticado con cero memberships activas navega a `/no-organization`
- **THEN** la página se renderiza dentro de `AppShell`, con CTA a `/account/invitations` y link a `/account/profile`

#### Scenario: Usuario con orgs es redirigido
- **WHEN** un usuario autenticado con al menos una membership activa navega directamente a `/no-organization`
- **THEN** la respuesta es `redirect("/post-login")`

#### Scenario: Visitante sin sesión
- **WHEN** un visitante sin cookie de sesión navega a `/no-organization`
- **THEN** la respuesta es `redirect("/login?next=/no-organization")`

#### Scenario: CTA navega a invitaciones
- **WHEN** el usuario clickea el CTA primario en `/no-organization`
- **THEN** la navegación termina en `/account/invitations`

### Requirement: `/no-organization` usa shell coherente con `/account/*`

La página SHALL reusar la misma construcción de `AppShell` que el layout de cuenta: misma resolución (cero orgs → placeholder), mismo `NavUser` para la navegación al cuenta, mismo sidebar sin items. Esto asegura que el usuario sin orgs experimenta el shell completo (no una pantalla aislada).

#### Scenario: Mismo chrome que `/account/profile` sin org
- **WHEN** se comparan visualmente `/no-organization` y `/account/profile` accedidos por un usuario sin orgs
- **THEN** ambos renderizan el mismo `AppShell` con `TeamSwitcher` placeholder y sidebar vacío de items de workspace
