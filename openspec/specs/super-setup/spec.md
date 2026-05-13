# super-setup Specification

## Purpose

Bootstrap del primer `super_admin`: endpoint `/super/setup` auto-desactivable cuando existe al menos un super, token de bootstrap obligatorio comparado en tiempo constante, creación atómica con lock para prevenir races, y verificación de email estándar.

## Requirements

### Requirement: Endpoint de setup auto-desactivable

El sistema SHALL exponer una ruta `/super/setup` y un endpoint server (server action o route handler en `app/super/setup/`) para registrar el primer super_admin. El endpoint SHALL estar disponible solo mientras `count(user where role = "super_admin") === 0`. En cualquier otro caso, la página y el endpoint SHALL responder con 404.

#### Scenario: Setup accesible sin super_admins
- **WHEN** un usuario navega a `/super/setup` y la BD no tiene ningún `user` con `role === "super_admin"`
- **THEN** la página se renderiza con el formulario de bootstrap

#### Scenario: Setup devuelve 404 con super_admin existente
- **WHEN** un usuario navega a `/super/setup` y existe al menos un `user` con `role === "super_admin"`
- **THEN** la respuesta es 404 (vía `notFound()` en Next.js)

#### Scenario: Endpoint POST también devuelve 404
- **WHEN** el endpoint server de setup recibe un POST con super_admin ya existente
- **THEN** responde con 404 sin tocar la BD ni validar el token

### Requirement: Token de bootstrap obligatorio

El endpoint de setup SHALL requerir un campo `setupToken` que coincida exactamente con la variable de entorno `SUPER_ADMIN_SETUP_TOKEN`. La comparación SHALL hacerse server-side con tiempo constante (por ejemplo, `crypto.timingSafeEqual`).

#### Scenario: Token correcto permite continuar
- **WHEN** el endpoint recibe `setupToken` que coincide con `SUPER_ADMIN_SETUP_TOKEN`
- **THEN** procede a la creación del super_admin

#### Scenario: Token incorrecto rechaza la operación
- **WHEN** el endpoint recibe `setupToken` que NO coincide
- **THEN** responde con error 401, sin crear usuario ni revelar si la cadena fue parcialmente correcta

#### Scenario: Variable de entorno ausente bloquea setup
- **WHEN** `SUPER_ADMIN_SETUP_TOKEN` no está definida en el entorno
- **THEN** el endpoint responde con 500 y un mensaje genérico de configuración faltante en logs server

### Requirement: Creación atómica del primer super_admin

La creación del primer super_admin SHALL ocurrir dentro de una transacción de BD que adquiera un lock sobre la tabla `user` (por ejemplo `SELECT ... FOR UPDATE` sobre `count(*) WHERE role = 'super_admin'` o lock advisory) para prevenir race conditions.

#### Scenario: Dos requests simultáneos crean solo un super
- **WHEN** dos requests válidos llegan al endpoint en paralelo con la BD vacía
- **THEN** exactamente uno crea el super_admin; el otro recibe 404 (porque el primero ya cerró la ventana) o un error de conflicto

#### Scenario: Creación falla a mitad de camino
- **WHEN** la creación del usuario falla tras la validación del token (por ejemplo, error de email duplicado)
- **THEN** la transacción se revierte y la ventana de setup queda abierta para reintentar

### Requirement: Verificación de email del primer super

El primer super_admin SHALL recibir email de verificación según el flujo estándar de better-auth. El usuario podrá autenticarse en `/login` solo después de verificar.

#### Scenario: Email de verificación enviado tras bootstrap
- **WHEN** se completa exitosamente el setup
- **THEN** se envía email de verificación al email proporcionado y se redirige a una pantalla informativa indicando que debe verificar antes de iniciar sesión
