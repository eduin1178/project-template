## MODIFIED Requirements

### Requirement: Layout RSC es la verdad para render

Cada layout de ruta protegida SHALL invocar `auth.api.getSession({ headers: await headers() })` y verificar el rol requerido. Si la sesión no existe o el rol no coincide, el layout SHALL invocar `notFound()` para `/super` y `redirect("/login")` para `/admin` y `/app`. Dentro de `/super`, esta verificación SHALL vivir en `app/super/(protected)/layout.tsx`, no en `app/super/layout.tsx`, para permitir rutas públicas hermanas bajo `app/super/(public)/`.

Los layouts `/(app)/layout.tsx` y `/admin/layout.tsx` SHALL NOT forzar redirect a `/super` por `user.role === "super_admin"`. Un usuario `super_admin` con membresía activa SHALL poder navegar `/app` y `/admin` igual que cualquier otro usuario; el acceso a `/super` queda gated únicamente por la capacidad `super_admin` en `/super/(protected)/layout.tsx`.

El criterio "es admin de tenant" usado por los layouts `/(app)/layout.tsx` y `/admin/layout.tsx` para decidir redirects entre sí SHALL evaluarse sobre el rol del usuario **en la organización activa resuelta**, no sobre el conjunto global de membresías del usuario.

#### Scenario: /super sin sesión devuelve 404
- **WHEN** se hace request directa a una ruta `/super/(protected)/*` con cookie inválida o ausente y proxy no la intercepta
- **THEN** el sublayout `(protected)` invoca `notFound()` y responde 404

#### Scenario: /super con sesión pero rol incorrecto devuelve 404
- **WHEN** un usuario autenticado con `user.role !== "super_admin"` navega a `/super/organizations`
- **THEN** el sublayout `(protected)` invoca `notFound()` y responde 404

#### Scenario: super con membresía activa accede a /admin de esa org
- **WHEN** un usuario con `user.role === "super_admin"` y `member.role === "admin"` activo en la org activa navega a `/admin`
- **THEN** el layout `/admin/layout.tsx` renderiza el shell admin sin redirigir a `/super`

#### Scenario: super con membresía member accede a /app de esa org
- **WHEN** un usuario con `user.role === "super_admin"` y `member.role === "member"` activo en la org activa navega a `/app`
- **THEN** el layout `/(app)/layout.tsx` renderiza el shell member sin redirigir a `/super`

#### Scenario: usuario admin en org A y member en org B con org activa B no entra en loop
- **WHEN** un usuario con memberships `[{orgA, admin}, {orgB, member}]` autentica con `activeOrganizationId === orgB`
- **THEN** termina en `/app` sin redirects intermedios cíclicos (el layout NO mira "soy admin en alguna org"; mira "soy admin en la org activa")

#### Scenario: /admin con rol incorrecto en org activa redirige al dashboard correcto
- **WHEN** un usuario llega a `/admin` con `activeOrgRole === "member"` (o sin membresía activa)
- **THEN** el layout invoca `redirectToDashboard()` (no `redirect("/app")` directo) para que el destino lo calcule la única función fuente-de-verdad
