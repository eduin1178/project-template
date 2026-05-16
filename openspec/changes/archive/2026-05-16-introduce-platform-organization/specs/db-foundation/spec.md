## MODIFIED Requirements

### Requirement: Migraciones de Drizzle versionadas y reentrantes

El sistema SHALL mantener las migraciones de Drizzle como archivos versionados en `next-app/lib/db/migrations/`. La migración inicial `0000_init.sql` SHALL contener el snapshot completo del schema (todas las tablas y constraints) tal como existe al momento de este change.

Migraciones intermedias previas a `0000_init.sql` SHALL ser eliminadas como parte de este change, dado que no hay base productiva y la cadena histórica de migraciones acumulada es de desarrollo. La política "migraciones nunca se editan después de aplicadas" SHALL contar **a partir de** este nuevo `0000_init.sql`.

El seed de la organización plataforma SHALL ejecutarse vía script separado `pnpm run db:seed-platform` (no como migración SQL), para mantener la migración pura de schema.

#### Scenario: Snapshot inicial cubre el schema completo
- **WHEN** se aplica `0000_init.sql` contra una base vacía
- **THEN** existen todas las tablas necesarias: `user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`, `task`, y todas las dependientes

#### Scenario: organization.slug es NOT NULL UNIQUE en 0000_init
- **WHEN** se inspecciona `0000_init.sql`
- **THEN** la columna `slug` de `organization` está declarada `NOT NULL UNIQUE`

#### Scenario: Seed de plataforma es script aparte
- **WHEN** se inspecciona `lib/db/migrations/`
- **THEN** ninguna migración SQL contiene `INSERT INTO organization VALUES (... 'docentix' ...)`. El seed vive en `lib/db/seed-platform.ts`.

#### Scenario: Rebuild local funciona desde cero
- **WHEN** un dev clona el repo, levanta `docker compose up -d` y corre `pnpm db:migrate && pnpm db:seed-platform`
- **THEN** la base queda con el schema completo y la org plataforma creada
