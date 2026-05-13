## Context

El producto se llama **Docentix**. El código nació como "Edunet" y nunca se renombró: 32 archivos contienen el literal `Edunet`/`edunet`, repartidos entre copy de UI, asuntos de email, identificadores internos del cliente de DB y configuración de docker-compose. El rename es mecánico pero cruza tres capas con riesgos distintos: presentación (texto visible), runtime (defaults de email, global key del cliente Drizzle) e infra local (volumen de Postgres).

No hay usuarios en producción todavía, así que no hay tokens de invitación en vuelo ni emails históricos que coordinar. El único impacto operativo es para devs locales que ya tengan el contenedor `edunet-postgres` corriendo con datos.

## Goals / Non-Goals

**Goals:**
- Cero ocurrencias del literal `Edunet`/`edunet` en código activo (excepto `openspec/changes/archive/**` que es historial inmutable).
- Brand consistente en toda la superficie user-facing: títulos de página, copy embebida, sidebar, emails transaccionales.
- Identificadores internos coherentes con la marca (global key, default de `EMAIL_FROM`, contenedor/credenciales de Postgres dev).
- Documentar el paso de migración para devs locales.

**Non-Goals:**
- Renombrar el directorio raíz del repo (`EDUNET/EDUNET/project-template/`) — fuera de alcance del codebase, decisión separada.
- Cambiar `package.json` `name: "next-app"` — es un identificador genérico, no de marca.
- Tocar changes archivados (`openspec/changes/archive/**`).
- Migrar datos existentes en Postgres dev (no hay datos productivos; el dev recrea el volumen).
- Cambiar el dominio de email de envío (`onboarding@resend.dev` queda igual; solo cambia la parte del nombre amigable).

## Decisions

### Decisión 1 — Renombrar también identificadores internos, no solo user-facing

**Elegido**: renombrar `__edunetDbClient` → `__docentixDbClient` y default de `EMAIL_FROM` además de copy.

**Alternativa**: dejar identificadores internos como están (son invisibles para el usuario final).

**Razón**: la global key `__edunetDbClient` es lo que ve un dev cuando debugea HMR o múltiples instancias del cliente Drizzle. Un nombre desalineado con el producto genera fricción en onboarding ("¿qué es Edunet, es legacy?"). El costo de renombrar es trivial (un archivo). El default de `EMAIL_FROM` se renombra porque es lo que ven los usuarios si nadie setea la env var en algún entorno.

### Decisión 2 — Renombrar credenciales y contenedor de Postgres en docker-compose

**Elegido**: cambiar `POSTGRES_USER`, `POSTGRES_DB`, `POSTGRES_PASSWORD` y `container_name` a `docentix*`.

**Alternativa A**: dejar credenciales como `edunet/edunet_dev/edunet` (son solo locales, no rompe nada técnico).
**Alternativa B**: cambiar todo y aceptar que devs deben recrear el volumen.

**Razón para B**: este es un template repo y el spec `db-foundation` documenta la URL como ejemplo canónico. Tener spec y `docker-compose.yml` desincronizados o mostrar `edunet` como "ejemplo" en un proyecto Docentix confunde más de lo que ahorra. El costo es un comando único (`docker compose down -v && docker compose up -d`) que se documenta en tasks. No hay datos productivos en juego.

### Decisión 3 — Mantener `onboarding@resend.dev` como dirección de envío

**Elegido**: cambiar solo el friendly name (`Edunet <...>` → `Docentix <...>`), no el dominio.

**Razón**: el dominio `resend.dev` es de Resend (sandbox de pruebas). Cambiarlo a algo como `noreply@docentix.com` requiere DNS/SPF/DKIM verificado en Resend, lo cual es una decisión de infra fuera de alcance. Cuando exista el dominio verificado, será otro change.

### Decisión 4 — Specs archivados quedan intactos

**Elegido**: solo modificar el spec activo `db-foundation` que contiene la URL de ejemplo. No tocar `openspec/changes/archive/**` aunque mencione "Edunet".

**Razón**: el archivo es historial. Reescribir historia rompe la trazabilidad ("¿qué decidió el equipo en mayo 2026?"). El nombre real del producto al momento del archive era Edunet — eso es un dato histórico válido.

### Decisión 5 — Una sola PR, no chained

**Elegido**: bundle todo en un solo PR aunque toque ~30 archivos.

**Razón**: es un find-and-replace coordinado. Partirlo en chunks deja estados intermedios donde la mitad de la app dice "Docentix" y la otra mitad "Edunet" — peor experiencia de revisión, no mejor. El diff es voluminoso pero cognitivamente trivial (cada hunk es la misma sustitución).

## Risks / Trade-offs

- **[Riesgo] Devs locales con datos en `edunet-postgres` los pierden** → Mitigación: documentar en `tasks.md` el paso de `docker compose down -v` + reaplicar migraciones (`npm run db:push`). No hay datos productivos.
- **[Riesgo] Alguien tiene `EMAIL_FROM` hardcodeado en su `.env.local` apuntando a "Edunet"** → Mitigación: el usuario ya confirmó que verificará su `.env.local` manualmente; la tarea lo incluye como checklist.
- **[Riesgo] Quedan literales "Edunet" sueltos no detectados por grep case-sensitive** → Mitigación: en tasks, un grep final case-insensitive sobre todo `next-app/` excluyendo `node_modules/` y `openspec/changes/archive/` para verificar 0 matches antes del commit.
- **[Riesgo] Tests que asertan contra "Edunet" rompen silenciosamente** → Mitigación verificada: el grep inicial mostró 0 matches en archivos `*.test.*` o `*.spec.*` (solo en `app/`, `lib/`, `components/`, infra y specs). No hay riesgo.
- **[Trade-off] El historial archivado queda con el nombre viejo** → Aceptado. Es un dato histórico; preservar trazabilidad pesa más que cosmética uniforme.

## Migration Plan

1. Aplicar todos los renames de código y copy en una sola PR.
2. Tras merge, cada dev local ejecuta:
   ```bash
   docker compose down -v
   docker compose up -d
   cd next-app && npm run db:push
   npm run db:seed-super-admin   # si aplica
   ```
3. Verificar `.env.local`: `EMAIL_FROM=Docentix <onboarding@resend.dev>` (o el equivalente del entorno).
4. Reiniciar el dev server (`npm run dev`).

Sin rollback necesario: si algo se rompe, el revert del commit + `docker compose down -v && up -d` con el código viejo restaura el estado previo.
