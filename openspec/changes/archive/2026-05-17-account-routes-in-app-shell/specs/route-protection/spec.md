## MODIFIED Requirements

### Requirement: Layout RSC del workspace es la verdad para render

Cada layout de ruta protegida SHALL invocar `auth.api.getSession({ headers: await headers() })` y aplicar el guard correspondiente:

- `app/[slug]/layout.tsx`:
  1. Si no hay sesión → `redirect("/login?next=/${slug}")`.
  2. Si el usuario autenticado no tiene NINGUNA membership activa en cualquier org → `redirect("/no-organization")` (defensa: el usuario no pertenece a nada y el destino correcto es informarle, no devolver 404).
  3. Si la org del slug no existe → `notFound()` (no se expone existencia de orgs ajenas).
  4. Si el usuario NO es miembro activo de ESA org específica (pero sí tiene memberships activas en otras) → `notFound()` (no se expone pertenencia a otras orgs).
- `app/[slug]/admin/layout.tsx`: si rol-en-org-del-slug NO es admin/owner → `redirect("/${slug}")`.
- `app/super/(protected)/layout.tsx`: si `user.role !== "super_admin"` → `notFound()`.

El layout NO consulta `session.activeOrganizationId` como fuente de autoridad; el slug de la URL es autoridad. Si difieren, el layout sincroniza la sesión al slug.

El orden de los chequeos en `app/[slug]/layout.tsx` es **importante**: el check de "cero orgs activas" SHALL ejecutarse antes que los checks de slug específico, porque la redirección a `/no-organization` aplica a cualquier slug cuando el usuario no pertenece a nada.

#### Scenario: /[slug] sin sesión redirige a /login con next
- **WHEN** un request sin cookie llega a `/<slug>`
- **THEN** redirect a `/login?next=/<slug>`

#### Scenario: /[slug] con usuario sin orgs activas redirige a /no-organization
- **WHEN** un usuario autenticado SIN ninguna membership activa navega a `/<slug>` (cualquier slug, exista o no la org)
- **THEN** redirect a `/no-organization` (NO `notFound()`)

#### Scenario: /[slug] de org inexistente devuelve 404 (usuario con orgs)
- **WHEN** un usuario autenticado con al menos una membership activa navega a `/slug-que-no-existe`
- **THEN** `notFound()` se invoca (404)

#### Scenario: /[slug] de org existente sin membresía devuelve 404 (usuario con orgs en otras)
- **WHEN** un usuario autenticado con memberships activas en otras orgs (pero no en ESTA) navega a `/<slug>`
- **THEN** `notFound()` se invoca (404). NO se hace `redirect` a `/no-organization`; no se expone existencia ni pertenencia

#### Scenario: /[slug]/admin de un member redirige a /[slug]
- **WHEN** un member intenta `/<slug>/admin`
- **THEN** redirect a `/<slug>` (donde sí puede entrar)

#### Scenario: /super con sesión pero rol incorrecto devuelve 404
- **WHEN** un usuario autenticado con `user.role !== "super_admin"` navega a `/super/organizations`
- **THEN** el sublayout `(protected)` invoca `notFound()` y responde 404
