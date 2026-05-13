## MODIFIED Requirements

### Requirement: Postgres en dev vía Docker Compose

El repositorio SHALL incluir un `docker-compose.yml` en su raíz que defina un servicio `postgres` (imagen `postgres:16-alpine`) con volumen nombrado, expuesto en `localhost:5432`, con credenciales y nombre de BD declarados.

#### Scenario: docker-compose.yml en raíz
- **WHEN** se inspecciona la raíz del repo
- **THEN** existe `docker-compose.yml` con servicio `postgres`, volumen persistente, y puertos publicados

#### Scenario: Levantar Postgres localmente
- **WHEN** se ejecuta `docker compose up -d` en una máquina dev
- **THEN** Postgres queda disponible en `postgresql://docentix:docentix_dev@localhost:5432/docentix` (o credenciales equivalentes documentadas en `.env.example`)
