# db-foundation Specification

## Purpose

Fundación de base de datos: Postgres vía Docker Compose para dev, Drizzle ORM como capa de acceso, schema de better-auth generado y commiteado, y scripts de migración.

## Requirements

### Requirement: Postgres en dev vía Docker Compose

El repositorio SHALL incluir un `docker-compose.yml` en su raíz que defina un servicio `postgres` (imagen `postgres:16-alpine`) con volumen nombrado, expuesto en `localhost:5432`, con credenciales y nombre de BD declarados.

#### Scenario: docker-compose.yml en raíz
- **WHEN** se inspecciona la raíz del repo
- **THEN** existe `docker-compose.yml` con servicio `postgres`, volumen persistente, y puertos publicados

#### Scenario: Levantar Postgres localmente
- **WHEN** se ejecuta `docker compose up -d` en una máquina dev
- **THEN** Postgres queda disponible en `postgresql://docentix:docentix_dev@localhost:5432/docentix` (o credenciales equivalentes documentadas en `.env.example`)

### Requirement: Drizzle ORM configurado

El proyecto SHALL configurar Drizzle ORM en `next-app/lib/db/`:

- `lib/db/client.ts` — instancia de Drizzle conectada a `process.env.DATABASE_URL` usando `postgres` (o `pg`)
- `lib/db/schema/index.ts` — re-exporta todas las tablas
- `drizzle.config.ts` en la raíz de `next-app/` — configuración para drizzle-kit

#### Scenario: Cliente Drizzle exportado
- **WHEN** un módulo server importa `db` desde `lib/db/client.ts`
- **THEN** obtiene una instancia de Drizzle conectada a la BD según `DATABASE_URL`

#### Scenario: DATABASE_URL ausente falla rápido
- **WHEN** se intenta inicializar el cliente sin `DATABASE_URL` definida
- **THEN** el módulo lanza error explícito al cargar (fail fast)

### Requirement: Schema de better-auth generado y commiteado

El schema de better-auth SHALL generarse con `@better-auth/cli generate` y commitearse en `next-app/lib/db/schema/auth.ts`. El proyecto SHALL exponer un script `npm run db:generate-auth-schema` que invoca el CLI.

#### Scenario: Schema versionado
- **WHEN** se inspecciona `lib/db/schema/auth.ts`
- **THEN** contiene las tablas `user`, `session`, `account`, `verification`, `organization`, `member`, `invitation` con las columnas que el plugin admin agrega (`role`, etc.)

#### Scenario: Script de regeneración
- **WHEN** se ejecuta `npm run db:generate-auth-schema`
- **THEN** el CLI regenera el archivo según la versión instalada de better-auth y plugins activos

### Requirement: Migraciones gestionadas por drizzle-kit

El proyecto SHALL exponer scripts npm:

- `db:push` — `drizzle-kit push` para dev (sync rápido sin SQL)
- `db:generate` — `drizzle-kit generate` para producir migración SQL versionada
- `db:migrate` — `drizzle-kit migrate` para aplicar migraciones en producción

Las migraciones SQL SHALL vivir en `next-app/lib/db/migrations/`.

#### Scenario: Scripts disponibles
- **WHEN** se inspecciona `next-app/package.json`
- **THEN** los scripts `db:push`, `db:generate`, `db:migrate`, `db:generate-auth-schema` están definidos

### Requirement: `.env.example` documenta todas las variables

El repositorio SHALL incluir `.env.example` (o `next-app/.env.example`) con las siguientes variables documentadas y valores de ejemplo seguros:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SUPER_ADMIN_SETUP_TOKEN`
- variables del proveedor de email (decidido en apply; placeholders incluidos)

#### Scenario: .env.example presente y completo
- **WHEN** se inspecciona el archivo
- **THEN** todas las variables listadas están presentes con comentario breve sobre su propósito y valor de ejemplo (nunca un secreto real)
