# workspace-routing Specification

## Purpose

Define cómo `/[slug]` modela el contexto activo del workspace de una organización, cómo se valida slug + membresía, cómo se sincroniza con la sesión, cómo se reservan slugs, y cómo se gatea la sección `/[slug]/admin`.

## Requirements

### Requirement: Segmento dinámico `[slug]` modela el contexto del workspace

El sistema SHALL servir todas las rutas del workspace de una organización bajo el segmento dinámico `app/[slug]/`. El valor `slug` SHALL corresponder al campo `organization.slug` (kebab-case, único, inmutable). NO existen rutas `/app/*` ni `/admin/*` como rutas globales; el workspace de una org se accede únicamente como `/<slug>/...` o `/<slug>/admin/...`.

Rutas del workspace:

- `/<slug>` — dashboard de workspace (vista member)
- `/<slug>/tasks` y `/<slug>/tasks/<taskId>` — tareas (vista member)
- `/<slug>/admin` — dashboard admin (gated por `member.role ∈ {admin, owner}` en la org del slug)
- `/<slug>/admin/tasks` y `/<slug>/admin/tasks/<taskId>` — administración de tareas

#### Scenario: URL del workspace siempre lleva slug
- **WHEN** un usuario navega al dashboard de su org
- **THEN** la URL tiene la forma `/<slug>` o `/<slug>/admin` (nunca `/app` ni `/admin`)

#### Scenario: URL vieja `/app` o `/admin` redirige
- **WHEN** un usuario navega a `/app` o `/admin`
- **THEN** el proxy lo redirige a `/post-login` que resuelve al slug correcto basado en la org activa

### Requirement: Layout `[slug]` valida slug y membresía

El layout `app/[slug]/layout.tsx` SHALL implementar el siguiente algoritmo:

1. Si no hay sesión → `redirect(\`/login?next=/${slug}\`)`
2. Obtener la organización por slug desde la tabla `organization`. Si no existe → `notFound()`.
3. Verificar que el usuario tiene membresía activa: existe fila en `member` con `userId = session.user.id`, `organizationId = org.id`, `status = "active"`. Si no es miembro → `notFound()` (NO `redirect`, para evitar oracle de existencia).
4. Si `session.activeOrganizationId !== org.id`:
   - Invocar `auth.api.setActiveOrganization({ body: { organizationSlug: slug } })`
   - Persistir `user.lastActiveOrganizationId = org.id`
5. Delegar render a sublayouts que aportan su propio `<AppShell>` (route groups `(member)` y `admin`).

#### Scenario: Slug inexistente devuelve 404
- **WHEN** un usuario autenticado navega a `/no-existe`
- **THEN** la respuesta es 404 vía `notFound()`

#### Scenario: Slug existente pero no es miembro devuelve 404
- **WHEN** un usuario autenticado sin membresía en `<slugX>` navega a `/<slugX>`
- **THEN** la respuesta es 404 (NO redirect; no se confirma ni se desmiente la existencia)

#### Scenario: Slug válido sincroniza activeOrganizationId
- **WHEN** un usuario abre `/<slugY>` con `session.activeOrganizationId !== orgY.id`
- **THEN** al terminar el render, la sesión apunta a `orgY.id` y `lastActiveOrganizationId === orgY.id`

#### Scenario: Multi-tab usa el slug de cada tab
- **WHEN** el usuario tiene dos tabs abiertas: tab A en `/<slugA>` y tab B en `/<slugB>`
- **THEN** cada tab opera sobre `params.slug` para queries server-side; la sesión refleja la última tab activa pero ninguna tab usa esa info para queries

### Requirement: Sección admin gated por rol-en-org

El layout `app/[slug]/admin/layout.tsx` SHALL verificar que el usuario tiene `member.role ∈ {"admin", "owner"}` activo en la org identificada por `params.slug`. Si no, SHALL invocar `redirect(\`/${slug}\`)` (NO `notFound`, porque sí puede ver `/<slug>`).

#### Scenario: Member intenta acceder a /<slug>/admin
- **WHEN** un usuario con `member.role === "member"` en `<orgX>` navega a `/<slugX>/admin`
- **THEN** el layout redirige a `/<slugX>` (la home del workspace que sí puede ver)

#### Scenario: Owner accede a /<slug>/admin
- **WHEN** un usuario con `member.role === "owner"` en `<orgX>` navega a `/<slugX>/admin`
- **THEN** la página renderiza normalmente

### Requirement: Slugs reservados

El sistema SHALL bloquear la creación de organizaciones con slugs reservados. La lista vive en `next-app/lib/auth/reserved-slugs.ts` y SHALL incluir, como mínimo: `super`, `account`, `api`, `login`, `signup`, `forgot-password`, `reset-password`, `verify-email`, `check-email`, `accept-invitation`, `post-login`, `_next`, `favicon.ico`, `robots.txt`, `sitemap.xml`, `admin`, `app`, `settings`, `billing`, `docs`, `help`, `status`, `blog`, `about`, `legal`, `privacy`, `terms`.

El sistema SHALL exponer `validateSlug(slug)` en el mismo módulo, que verifica regex `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`, longitud 3–40 caracteres, NO reservado. El validador SHALL usarse en la action que crea organizaciones.

El slug de la organización plataforma (`"docentix"`) NO está en la lista de reservados (porque ES una org real). Cualquier otra org NO puede usar ese slug por el constraint `UNIQUE` de la columna.

#### Scenario: Crear org con slug reservado falla
- **WHEN** un super invoca la action de creación de org con `slug = "admin"`
- **THEN** la action falla con un error de validación de slug

#### Scenario: Slug debe respetar kebab-case
- **WHEN** un super intenta crear org con `slug = "Mi Org"` o `slug = "mi_org"`
- **THEN** la action falla con error de formato

### Requirement: Slug inmutable

El sistema SHALL tratar el slug de una organización como inmutable. La UI de edición de organización NO ofrece editar el slug. Si una org necesita renombrarse, se cambia `name`, no `slug`.

#### Scenario: UI no permite editar slug
- **WHEN** un super o admin abre el formulario de edición de una org
- **THEN** el campo slug es read-only o no aparece

### Requirement: Switch de org por slug y navegación

El team switcher SHALL hacer dos cosas al cambiar de org:

1. `router.push(\`/${nuevoSlug}\`)` para que la navegación pase a ser la fuente de verdad del contexto.
2. Invocar `switchActiveOrganizationAction(nuevoSlug)` para persistir el cache de "última org visitada" (`lastActiveOrganizationId`).

Estas dos operaciones SHALL ocurrir en paralelo. La acción del servidor SHALL aceptar slug, NO id.

#### Scenario: Clic en switcher navega y persiste
- **WHEN** un usuario clica una org en el team switcher
- **THEN** la URL cambia a `/<slug>` Y la sesión + `lastActiveOrganizationId` se actualizan

#### Scenario: Switcher solo lista orgs donde el usuario es miembro activo
- **WHEN** el team switcher se renderiza
- **THEN** los items corresponden a `loadActiveOrganizationsFor(userId)` (membresías activas)
