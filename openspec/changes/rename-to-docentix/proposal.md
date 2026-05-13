## Why

El producto pasó a llamarse **Docentix**. Hoy el código, la copy, los emails transaccionales, los títulos de página, los identificadores internos del cliente de DB y la infraestructura local (docker-compose) siguen usando "Edunet". Tener dos nombres conviviendo confunde a los usuarios finales (verán "Edunet" en sus correos de invitación) y a quien onboardea en el código (no queda claro si "Edunet" es legacy, alias o el nombre real).

## What Changes

- Renombrar todas las cadenas **user-facing** de `Edunet` a `Docentix`:
  - `metadata.title` de cada página (`app/**/page.tsx`)
  - Asunto y cuerpo de emails transaccionales (`lib/auth/emails.ts`, `lib/auth/server.ts`, `app/super/actions.ts`)
  - Copy embebida en páginas (`accept-invitation`, `super/(public)/accept-invitation`, `app/page.tsx`)
  - `label` del brand del sidebar para los tres contextos (`components/layout/contexts/{admin,app,super}.ts`)
- Renombrar identificadores **internos** del código:
  - Global key del cliente Drizzle: `__edunetDbClient` → `__docentixDbClient` en `lib/db/client.ts`
  - Default de `EMAIL_FROM` en `lib/auth/emails.ts`: `"Edunet <onboarding@resend.dev>"` → `"Docentix <onboarding@resend.dev>"`
- Renombrar la **infraestructura local** en `docker-compose.yml`:
  - `container_name`, `POSTGRES_USER`, `POSTGRES_DB` → valores `docentix`/`docentix-postgres`/`docentix_dev`
  - **BREAKING (solo dev local)**: invalida el volumen de Postgres existente — hay que borrarlo y recrearlo. Se documenta en tasks.
- Actualizar specs históricas que mencionan el nombre técnico:
  - `openspec/specs/db-foundation/spec.md` → URL de conexión de ejemplo
- **Fuera de alcance**: directorio raíz del repo (`EDUNET/EDUNET/project-template/`), `package.json` `name` (`next-app`), changes archivados (`openspec/changes/archive/**` queda intacto como historial), `AGENTS.md`/`CLAUDE.md` que no nombran el producto.

## Capabilities

### New Capabilities
<!-- Ninguna. Es un rename mecánico, no introduce nueva funcionalidad. -->

### Modified Capabilities
- `db-foundation`: el spec menciona `postgresql://edunet:edunet_dev@localhost:5432/edunet` como URL de ejemplo. Se actualiza a la nueva credencial para mantener el spec coherente con `docker-compose.yml`.

## Impact

- **Código afectado**: ~30 archivos `.tsx`/`.ts` con literales de marca, 3 contextos de sidebar, `lib/db/client.ts`, `lib/auth/emails.ts`, `lib/auth/server.ts`, `app/super/actions.ts`, `docker-compose.yml`, `openspec/specs/db-foundation/spec.md`.
- **Usuarios finales**: cambia el remitente y asunto de los correos transaccionales (invitaciones, reset password, verify email). Nadie tiene tokens en vuelo en producción todavía, así que no hay que coordinar ventana.
- **Devs locales**: deben recrear el contenedor y volumen de Postgres tras el merge (`docker compose down -v && docker compose up -d`) y reaplicar migraciones. Documentar en `README` o tasks.
- **`.env.local` del usuario**: el equipo debe verificar que `EMAIL_FROM` esté seteado a `Docentix <...>` (el default del código se actualiza, pero env override gana).
- **Sin cambios de schema de datos** ni de API pública. Sin migraciones de Drizzle.
- **Sin impacto en tests** (no hay aserciones contra el literal "Edunet" según los archivos revisados).
