## ADDED Requirements

### Requirement: Identidad visual de Docentix en páginas de autenticación

El sistema SHALL renderizar el logo horizontal de Docentix por fuera y arriba de la `<Card>` principal en todas las páginas dentro del route group `next-app/app/(auth)/`: `login`, `forgot-password`, `reset-password`, `verify-email` y `check-email`.

El logo SHALL adaptarse al tema activo:
- Tema claro: `/images/logo-horizontal.png`.
- Tema oscuro: `/images/logo-horizontal-dark.png`.

El cambio de variante SHALL realizarse vía CSS (`block dark:hidden` / `hidden dark:block`) sin depender de estado de cliente para evitar flicker durante la hidratación.

Para evitar duplicación, el sistema SHALL exponer un componente compartido `AuthCardLayout` (en `next-app/components/auth/auth-card-layout.tsx` o ubicación equivalente) que encapsule el wrapper de centrado, el logo y la `<Card>` con sus slots.

#### Scenario: Login muestra logo arriba de la card
- **WHEN** un usuario no autenticado navega a `/login`
- **THEN** la página renderiza, antes y por fuera de la `<Card>`, una imagen del logo horizontal de Docentix con `alt` no vacío

#### Scenario: Forgot password muestra logo arriba de la card
- **WHEN** un usuario navega a `/forgot-password`
- **THEN** la página renderiza el logo horizontal arriba y por fuera de la `<Card>` principal

#### Scenario: Reset password muestra logo arriba de la card
- **WHEN** un usuario navega a `/reset-password` con un token válido
- **THEN** la página renderiza el logo horizontal arriba y por fuera de la `<Card>` principal

#### Scenario: Verify email muestra logo arriba de la card
- **WHEN** un usuario navega a `/verify-email`
- **THEN** la página renderiza el logo horizontal arriba y por fuera de la `<Card>` principal

#### Scenario: Check email muestra logo arriba de la card
- **WHEN** un usuario navega a `/check-email`
- **THEN** la página renderiza el logo horizontal arriba y por fuera de la `<Card>` principal

#### Scenario: Variante dark del logo en tema oscuro
- **WHEN** el tema activo del documento es `dark` y se inspecciona el DOM
- **THEN** la variante visible del logo es `logo-horizontal-dark.png` y la variante clara está oculta por CSS

#### Scenario: Componente compartido reutilizado
- **WHEN** se inspecciona el árbol de componentes de las 5 páginas
- **THEN** todas usan el mismo wrapper compartido (`AuthCardLayout` o equivalente) para envolver el logo y la card

### Requirement: Logo oficial de Google en el botón de OAuth

El botón "Continuar con Google" en `next-app/app/(auth)/login/login-form.tsx` SHALL incluir el logo oficial multicolor de Google ("G" con los cuatro colores oficiales) a la izquierda del texto.

El logo SHALL servirse como asset SVG estático ubicado en `next-app/public/images/google-logo.svg` (descargado de fuente oficial y NO modificado en colores ni proporciones) y SHALL renderizarse mediante `next/image`.

El botón NO SHALL usar un ícono monocromo (por ejemplo, `GoogleLogoIcon` de Phosphor) porque viola las brand guidelines de Google para botones de sign-in.

#### Scenario: Botón Google muestra el logo oficial
- **WHEN** un usuario navega a `/login`
- **THEN** el botón "Continuar con Google" incluye una imagen `<Image>` cuyo `src` apunta a `/images/google-logo.svg`, a la izquierda del texto

#### Scenario: Asset disponible en public
- **WHEN** se inspecciona `next-app/public/images/`
- **THEN** existe el archivo `google-logo.svg` y NO está modificado respecto al original oficial de Google

#### Scenario: Sin íconos monocromos para Google
- **WHEN** se inspecciona el JSX del botón "Continuar con Google"
- **THEN** NO se importa ni renderiza `GoogleLogoIcon` (Phosphor) ni equivalente monocromo
