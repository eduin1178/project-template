## ADDED Requirements

### Requirement: Ruta `/super` con layout propio

El sistema SHALL exponer la ruta `/super` con `app/super/layout.tsx` y `app/super/page.tsx`. El layout SHALL ser independiente del layout público (no comparte navbar/footer de la landing) y SHALL ser preparado para crecer con navegación propia en fases futuras.

#### Scenario: Layout separado del público
- **WHEN** se inspecciona la estructura de `app/`
- **THEN** existe `app/super/layout.tsx` con su propio shell (sin importar componentes de navegación pública)

### Requirement: Login unificado en `/login`

El sistema SHALL exponer la ruta pública `/login` con formulario único para los tres roles. El formulario SHALL ofrecer email/password y botón "Continuar con Google". Post-auth, el servidor SHALL redirigir según `deriveDashboardHref(session)`.

#### Scenario: Render del login
- **WHEN** un usuario no autenticado navega a `/login`
- **THEN** ve formulario con campos email/password, botón submit, botón "Continuar con Google", enlace a "¿Olvidaste tu contraseña?"

#### Scenario: Login exitoso redirige según rol
- **WHEN** un usuario completa login exitosamente
- **THEN** el server redirige a la ruta retornada por `deriveDashboardHref(session)`

#### Scenario: Login con usuario ya autenticado
- **WHEN** un usuario autenticado navega a `/login`
- **THEN** el server redirige directamente a `deriveDashboardHref(session)` sin renderizar el formulario

### Requirement: Dashboard mínimo de super

El sistema SHALL renderizar en `/super` (cuando autorizado) un dashboard mínimo con: saludo al usuario por nombre/email, accesos placeholder a futuras secciones (no funcionales aún), y formulario o CTA para invitar a otro super_admin.

#### Scenario: Dashboard accesible para super_admin autenticado
- **WHEN** un super_admin autenticado navega a `/super`
- **THEN** ve el dashboard mínimo con saludo y CTA de invitación

#### Scenario: CTA de invitación visible
- **WHEN** se renderiza el dashboard
- **THEN** existe un componente que permite enviar invitación (modal, form inline, o ruta dedicada `/super/invitations/new`)

### Requirement: Placeholders en `/admin` y `/app`

El sistema SHALL exponer rutas `/admin` y `/app` con páginas placeholder que muestren un mensaje breve indicando que la sección está en construcción. Estas rutas SHALL estar protegidas por rol mediante el mismo patrón defense-in-depth.

#### Scenario: Acceso a /admin como admin de tenant
- **WHEN** un usuario con `member.role === "admin"` autenticado navega a `/admin`
- **THEN** ve la página placeholder

#### Scenario: Acceso a /app como user
- **WHEN** un usuario con `member.role === "member"` (o sin memberships) autenticado navega a `/app`
- **THEN** ve la página placeholder

### Requirement: UI consistente con shadcn/ui

Toda la UI nueva (`/login`, `/super`, `/super/setup`, `/accept-invitation`, `/admin` y `/app` placeholders) SHALL usar componentes de shadcn/ui. La copy SHALL ser español neutral con segunda persona `tú` (sin voseo).

#### Scenario: Inspección de imports
- **WHEN** se inspecciona cualquiera de las páginas nuevas
- **THEN** los componentes interactivos (botones, inputs, forms, cards) provienen de `@/components/ui/*` instalados via shadcn

#### Scenario: Copy en español neutral
- **WHEN** se revisa la copy de UI
- **THEN** usa "Ingresa", "Selecciona", "Inicia sesión", "Cuéntanos" — no "Ingresá", "Seleccioná", "Iniciá sesión", "Contanos"
