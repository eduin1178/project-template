# auth Specification

## Purpose

Sistema de autenticación basado en better-auth con email/password y Google OAuth, verificación de email, recuperación de contraseña y sesiones gestionadas por cookies.

## Requirements

### Requirement: Better-auth como motor de autenticación

El proyecto SHALL usar better-auth como sistema de autenticación, configurado en `lib/auth/server.ts` con su adaptador para Drizzle y Postgres. El cliente correspondiente SHALL exponerse desde `lib/auth/client.ts`.

#### Scenario: Server y client coherentes
- **WHEN** un módulo cliente importa desde `lib/auth/client.ts`
- **THEN** obtiene un `authClient` creado con `createAuthClient` de better-auth, apuntando al endpoint expuesto por el servidor

#### Scenario: Endpoint montado en App Router
- **WHEN** una petición llega a `/api/auth/[...all]`
- **THEN** es manejada por el handler de better-auth (`toNextJsHandler(auth)` o equivalente) y responde según la operación solicitada

### Requirement: Email y contraseña habilitados

El servidor SHALL habilitar el proveedor `emailAndPassword` con `requireEmailVerification: true`. Usuarios SHALL poder registrarse y autenticarse con email y contraseña.

#### Scenario: Signup con email y password
- **WHEN** un usuario envía email y contraseña válidos al endpoint de signup
- **THEN** se crea el `user` con `emailVerified: false`, se envía email de verificación, y se devuelve sesión pendiente de verificación según comportamiento estándar de better-auth

#### Scenario: Signin con credenciales correctas
- **WHEN** un usuario con email verificado envía email y contraseña correctos
- **THEN** se crea una sesión válida y se establece la cookie de sesión

#### Scenario: Signin con email no verificado
- **WHEN** un usuario con `emailVerified: false` intenta autenticarse
- **THEN** la operación falla con error de verificación pendiente y se reenvía email de verificación

### Requirement: Google OAuth habilitado para todos los roles

El servidor SHALL habilitar el proveedor social `google` en `socialProviders`. Cualquier flujo (signup, signin, aceptación de invitación) SHALL poder usarlo.

#### Scenario: Signin con Google exitoso
- **WHEN** un usuario completa el flujo OAuth de Google con email no registrado previamente
- **THEN** se crea un nuevo `user` con `emailVerified: true` (vía Google) y `role: "user"`, se crea cuenta vinculada en la tabla `account`, y se establece sesión

#### Scenario: Signin con Google de cuenta existente
- **WHEN** un usuario completa el flujo OAuth de Google con un email ya registrado
- **THEN** se vincula la cuenta de Google al usuario existente (si no estaba vinculada) y se establece sesión

### Requirement: Verificación de email

El sistema SHALL enviar email de verificación al registrarse con email/password y SHALL exponer un endpoint para reenviar el email. El usuario no verificado SHALL NO poder autenticarse con email/password.

#### Scenario: Email de verificación enviado en signup
- **WHEN** un usuario completa signup con email/password
- **THEN** se envía un email con enlace de verificación que contiene un token válido

#### Scenario: Verificación exitosa
- **WHEN** el usuario abre el enlace de verificación con un token válido
- **THEN** `emailVerified` pasa a `true` y se redirige al usuario a `/login` con confirmación

### Requirement: Recuperación de contraseña

El sistema SHALL exponer el flujo estándar de better-auth para recuperación de contraseña (request reset + reset con token).

#### Scenario: Solicitud de reset
- **WHEN** un usuario solicita restablecer contraseña indicando su email
- **THEN** se envía email con enlace que contiene token de reset; la respuesta NO revela si el email existe o no

#### Scenario: Reset con token válido
- **WHEN** el usuario abre el enlace y envía nueva contraseña
- **THEN** la contraseña se actualiza, se invalidan sesiones existentes del usuario, y se redirige a `/login`

### Requirement: Sesiones gestionadas por better-auth

Las sesiones SHALL usar las cookies estándar de better-auth con `httpOnly: true`, `sameSite: "lax"`, y `secure: true` en producción. La sesión SHALL ser accesible desde server components vía `auth.api.getSession({ headers: await headers() })`.

#### Scenario: Cookie de sesión en signin exitoso
- **WHEN** un usuario completa signin
- **THEN** la respuesta incluye `Set-Cookie` con la cookie de sesión marcada `httpOnly`, `sameSite=lax`, y `secure` cuando `NODE_ENV === "production"`

#### Scenario: getSession en server component
- **WHEN** un server component llama `auth.api.getSession({ headers: await headers() })`
- **THEN** retorna el objeto de sesión si las cookies son válidas, o `null` si no hay sesión

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
