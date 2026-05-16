# platform-organization Specification

## Purpose

La organización plataforma (slug fijo `docentix`) donde todo `super_admin` es miembro `owner`. Incluye reglas de bootstrap, idempotencia, atribución y la garantía de que el seed es reentrante. Modela el patrón Vercel/Linear/Notion: el fabricante opera su propio producto como un tenant más.

## Requirements

### Requirement: Existencia de la organización plataforma

El sistema SHALL mantener exactamente una organización con `slug === "docentix"` en la tabla `organization`. Esta organización SHALL llamarse `"Docentix"` y SHALL existir desde el primer arranque productivo del sistema.

#### Scenario: Bootstrap crea la org plataforma
- **WHEN** el seed `db:seed-platform` se ejecuta sobre una base recién migrada
- **THEN** existe una fila en `organization` con `slug = "docentix"` y `name = "Docentix"`

#### Scenario: Bootstrap idempotente
- **WHEN** el seed `db:seed-platform` se ejecuta una segunda vez
- **THEN** no se crean filas adicionales y el comando termina sin error

### Requirement: Constantes y helpers de la org plataforma

El sistema SHALL exponer en `next-app/lib/auth/platform-org.ts` con `import "server-only"`:

- `PLATFORM_ORG_SLUG = "docentix"` (constante string)
- `PLATFORM_ORG_NAME = "Docentix"` (constante string)
- `getOrCreatePlatformOrg(executor?)`: SELECT por slug; INSERT si no existe; retorna `{ id, slug, name }`
- `ensurePlatformMembership(userId, executor?)`: garantiza org plataforma + INSERT idempotente en `member` con `role="owner"`, `status="active"`

Ambos helpers SHALL aceptar un executor opcional para componerse dentro de transacciones de otros flujos.

#### Scenario: ensurePlatformMembership es idempotente
- **WHEN** `ensurePlatformMembership(userId)` se invoca dos veces para el mismo `userId`
- **THEN** la segunda llamada no inserta filas duplicadas ni lanza error; retorna el mismo `{ organizationId, role: "owner" }`

#### Scenario: helpers respetan la transacción provista
- **WHEN** `ensurePlatformMembership(userId, tx)` se invoca dentro de una transacción `tx` que luego se hace rollback
- **THEN** ni la org ni la membership persisten en la base tras el rollback

### Requirement: Todo super_admin pertenece a la org plataforma

El sistema SHALL garantizar que todo usuario con `user.role === "super_admin"` tiene al menos una fila activa en `member` con `organizationId = <orgPlataforma.id>`, `role = "owner"` y `status = "active"`.

Cualquier flujo que cree un nuevo `super_admin` SHALL invocar `ensurePlatformMembership(newUser.id)` antes de completar la transacción de creación.

#### Scenario: Bootstrap super crea membership en la org plataforma
- **WHEN** `/super/setup` crea el primer `super_admin`
- **THEN** existe `member(userId=<nuevo>, organizationId=<orgPlataforma>, role="owner", status="active")` cuando termina la transacción

#### Scenario: Aceptación de invitación super crea membership
- **WHEN** el flujo `/super/(public)/accept-invitation` completa la creación del `super_admin`
- **THEN** existe la membership en la org plataforma

#### Scenario: Seed legacy enrola supers existentes
- **WHEN** `pnpm run db:seed-platform` se ejecuta tras el reset de migraciones contra una DB con supers preexistentes
- **THEN** cada uno de esos supers tiene membership activa en la org plataforma al finalizar el script

### Requirement: Última org activa de un super por defecto

El sistema SHALL setear `user.lastActiveOrganizationId = <orgPlataforma.id>` para todo super al momento de:

- Crearse via `/super/setup`
- Crearse via aceptación de invitación super
- Ser enrolado por el script `db:seed-platform`

#### Scenario: lastActiveOrganizationId apunta a la plataforma
- **WHEN** un super recién creado abre `/post-login` por primera vez
- **THEN** `resolveActiveOrganization` retorna la org plataforma como activa (sin que el usuario tenga que elegir)
