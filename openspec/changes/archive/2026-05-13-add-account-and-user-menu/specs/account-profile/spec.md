## ADDED Requirements

### Requirement: Ruta `/account/profile`

El sistema SHALL exponer `app/account/profile/page.tsx` accesible para cualquier usuario autenticado, sin importar su rol. Si no hay sesión, SHALL redirigir a `/login`.

#### Scenario: Acceso con sesión válida
- **WHEN** un usuario autenticado navega a `/account/profile`
- **THEN** la página renderiza con tres secciones: datos básicos, contraseña y cuentas vinculadas

#### Scenario: Acceso sin sesión
- **WHEN** un visitante sin sesión navega a `/account/profile`
- **THEN** se redirige a `/login`

### Requirement: Edición de datos básicos

El sistema SHALL permitir actualizar `name` e `image` del usuario autenticado mediante una server action que invoque `auth.api.updateUser`.

#### Scenario: Actualización exitosa
- **WHEN** un usuario envía el form con `name` no vacío
- **THEN** la action invoca `updateUser`, persiste los cambios y muestra confirmación

#### Scenario: Name vacío
- **WHEN** el form se envía con `name` en blanco
- **THEN** la action rechaza con error de validación inline; no se llama a `updateUser`

### Requirement: Cambio de contraseña para usuarios con credenciales

El sistema SHALL permitir cambiar contraseña a usuarios que ya tienen una password registrada (fila en `account` con `providerId = "credential"` y `password !== null`). La operación SHALL usar `auth.api.changePassword` con `revokeOtherSessions: true`.

#### Scenario: Cambio exitoso
- **WHEN** un usuario con password envía `currentPassword` correcta y `newPassword` válida (≥ 8 chars)
- **THEN** la contraseña se actualiza, todas las demás sesiones del usuario se revocan, y se muestra confirmación

#### Scenario: Current password incorrecta
- **WHEN** el usuario envía una `currentPassword` que no coincide
- **THEN** la action rechaza con error explícito sin tocar la BD

#### Scenario: New password débil
- **WHEN** la `newPassword` tiene menos de 8 caracteres o no cumple las reglas del servidor
- **THEN** la action rechaza con error de validación

### Requirement: Establecer contraseña para usuarios OAuth-only

El sistema SHALL permitir a un usuario sin credenciales locales (sin fila `account` con `providerId = "credential"`) establecer una contraseña directamente desde la sesión vigente, sin email de confirmación, invocando `auth.api.setPassword`.

#### Scenario: Usuario Google-only establece password
- **WHEN** un usuario cuya única `account` tiene `providerId = "google"` envía el form con una `newPassword` válida
- **THEN** la action invoca `setPassword`, se persiste la credencial, y el usuario queda en condición de hacer login por email/password

#### Scenario: Usuario que ya tiene password no ve el form de set
- **WHEN** el usuario tiene credenciales locales registradas
- **THEN** la sección renderiza el form de "Cambiar contraseña" y nunca el de "Establecer contraseña"

### Requirement: Vinculación de cuenta Google

El sistema SHALL permitir vincular una cuenta de Google al usuario autenticado cuando todavía no exista una fila `account` con `providerId = "google"`. La operación SHALL usar `authClient.linkSocial({ provider: "google", callbackURL: "/account/profile" })`.

#### Scenario: Vinculación exitosa
- **WHEN** un usuario sin Google vinculado clickea "Vincular Google" y completa el flujo OAuth
- **THEN** al retornar al callback se persiste la fila en `account` y la sección lista Google como vinculada

#### Scenario: Vinculación con cuenta de Google ya usada por otro usuario
- **WHEN** el flujo OAuth retorna con un email de Google que ya está vinculado a otro `user`
- **THEN** better-auth rechaza la vinculación y la UI muestra el error correspondiente

### Requirement: Desvinculación de cuenta con guardrail anti-lockout

El sistema SHALL permitir desvincular una cuenta (Google o credencial) solo si después de la operación el usuario conserva al menos un método de acceso válido. La validación SHALL ocurrir server-side antes de invocar `auth.api.unlinkAccount`.

#### Scenario: Desvinculación válida
- **WHEN** un usuario con Google + password clickea "Desvincular Google"
- **THEN** la action verifica que sigue teniendo credencial local, invoca `unlinkAccount`, y la fila Google se elimina

#### Scenario: Desvinculación bloqueada
- **WHEN** un usuario cuyo único método es Google intenta desvincular Google
- **THEN** la action rechaza con error "No puedes desvincular tu única forma de iniciar sesión"; no se invoca `unlinkAccount`

#### Scenario: Botón de desvincular oculto cuando bloquearía acceso
- **WHEN** la sección "Cuentas vinculadas" renderiza para un usuario con un único método
- **THEN** el botón "Desvincular" para ese método está disabled con tooltip explicativo

### Requirement: Server actions ubicadas en `app/account/profile/actions.ts`

Todas las actions de perfil (`updateProfileAction`, `changePasswordAction`, `setPasswordAction`, `unlinkAccountAction`) SHALL estar en `app/account/profile/actions.ts`, marcadas con `"use server"`, y SHALL invocar `requireSession` antes de cualquier operación. La vinculación inicial de Google (que requiere redirect OAuth) SHALL ejecutarse desde el cliente vía `authClient.linkSocial`.

#### Scenario: Action sin sesión
- **WHEN** se invoca cualquier action de perfil sin cookie de sesión válida
- **THEN** la action lanza error `UNAUTHENTICATED` antes de cualquier operación de BD
