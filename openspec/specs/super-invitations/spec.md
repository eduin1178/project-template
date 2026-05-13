# super-invitations Specification

## Purpose

Sistema de invitaciones para promover usuarios a `super_admin`. Tabla propia `superInvitation` con token criptográfico, página de aceptación pública, y aceptación atómica (email/password o Google) sin validar coincidencia de email.

## Requirements

### Requirement: Tabla `superInvitation` propia

El sistema SHALL definir una tabla `superInvitation` en `lib/db/schema/super-invitation.ts` con al menos los siguientes campos:

- `id` (uuid, primary key)
- `token` (text, unique, no nulo) — generado con `randomBytes(32)` y codificado en base64url
- `invitedEmail` (text, no nulo) — informativo, NO se valida en aceptación
- `invitedBy` (text, no nulo, FK a `user.id`)
- `expiresAt` (timestamp, no nulo) — 7 días desde la creación
- `acceptedAt` (timestamp, nullable)
- `acceptedBy` (text, nullable, FK a `user.id`)
- `createdAt`, `updatedAt` (timestamps)

#### Scenario: Schema declarado y exportado
- **WHEN** se inspecciona el módulo `lib/db/schema/super-invitation.ts`
- **THEN** exporta la tabla con los campos indicados y `token` marcado como único

### Requirement: Creación de invitación solo por super_admin

El sistema SHALL exponer una server action `createSuperInvitation({ email })` que SHALL verificar `auth.api.getSession()` y rechazar si el rol del solicitante NO es `super_admin`. La action SHALL generar un token criptográficamente seguro, persistirlo, y enviar email con enlace `${baseUrl}/super/accept-invitation?token={token}`.

#### Scenario: Super_admin invita
- **WHEN** un super_admin autenticado invoca `createSuperInvitation` con un email válido
- **THEN** se crea el registro en `superInvitation`, se envía el email con link bajo `/super/accept-invitation`, y la action retorna confirmación

#### Scenario: Usuario no super_admin intenta invitar
- **WHEN** un usuario sin rol `super_admin` invoca la action
- **THEN** la action lanza error (no autorizado) sin crear registro

### Requirement: Página de aceptación `/super/accept-invitation`

El sistema SHALL exponer la ruta pública `/super/accept-invitation?token={token}` (route group `(public)` dentro de `/super`) que SHALL validar el token (existe, no expirado, no aceptado) y renderizar formulario de signup pre-llenado con `invitedEmail` (campo editable).

#### Scenario: Token válido renderiza formulario
- **WHEN** se navega a `/super/accept-invitation?token=...` con un token válido
- **THEN** se renderiza un formulario de signup con `email` pre-llenado al `invitedEmail` y opción de email/password o Google

#### Scenario: Token inválido o expirado
- **WHEN** el token no existe, está expirado, o ya fue aceptado
- **THEN** se renderiza un mensaje de error claro sin formulario, con CTA hacia `/login`

#### Scenario: Ruta antigua redirige con token
- **WHEN** una request llega a `/accept-invitation?token=...` (URL legacy de emails ya enviados)
- **THEN** el server responde con redirect 308 a `/super/accept-invitation?token={token}` preservando el query param

#### Scenario: Ruta pública exenta del guard de rol
- **WHEN** un visitante no autenticado navega a `/super/accept-invitation?token=...`
- **THEN** el layout `(public)` permite el render sin invocar `requireSuperAdmin`

### Requirement: Aceptación atómica de invitación

La aceptación de invitación (sea por email/password o Google) SHALL ocurrir en una transacción que: (a) re-valide el token, (b) cree o asocie el `user`, (c) marque `user.role = "super_admin"`, (d) marque la invitación `acceptedAt` y `acceptedBy`. Si cualquier paso falla, todo se revierte. La server action SHALL vivir bajo `app/super/(public)/accept-invitation/`.

#### Scenario: Aceptación con email/password
- **WHEN** un usuario envía signup desde `/super/accept-invitation` con token válido
- **THEN** en una transacción se crea `user` (con `role = "super_admin"`), se marca la invitación como aceptada, y se redirige a `/login` o `/super` según corresponda

#### Scenario: Aceptación con Google
- **WHEN** un usuario completa OAuth de Google desde `/super/accept-invitation` (el token se persiste en estado/PKCE/cookie durante el redirect)
- **THEN** al volver, en una transacción se asocia el `user` retornado por Google con la invitación, se establece `role = "super_admin"`, y se marca la invitación aceptada

#### Scenario: Token aceptado solo una vez
- **WHEN** dos intentos de aceptación llegan en paralelo con el mismo token
- **THEN** exactamente uno tiene éxito; el otro recibe error de invitación ya aceptada

### Requirement: NO se valida coincidencia de email

El sistema SHALL NOT comparar el email retornado por Google ni el email del formulario contra `invitedEmail` durante la aceptación. El token es la única autoridad.

#### Scenario: Aceptación con email distinto al invitado
- **WHEN** la invitación tiene `invitedEmail: "a@x.com"` y el usuario acepta con `b@y.com`
- **THEN** la aceptación es exitosa y el super_admin queda registrado con `b@y.com`
