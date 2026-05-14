## Why

Docentix necesita una unidad básica de trabajo asignable dentro de cada organización para que admins y owners puedan registrar, priorizar y dar seguimiento a actividades. Hoy la app cubre cuentas, organizaciones y membresías, pero no tiene ninguna entidad de trabajo: sin `Task`, no se puede construir el resto del dominio (asignaciones, documentos, comentarios, checklist) en futuras propuestas.

## What Changes

- Nueva entidad `Task` por organización con `title`, `description`, `dueAt`, `visibility`, `status`, `authorId`, `organizationId`, timestamps.
- Enums controlados por base de datos vía CHECK constraints:
  - `visibility ∈ { draft, active, archived }` — default `draft`
  - `status ∈ { pending, in_progress, done }` — default `pending`
- Server actions del lado del servidor para crear/editar/transicionar tareas; validación en Zod + lógica en la action; CHECK en DB como defensa en profundidad.
- Reglas de transición:
  - `visibility`: `draft ↔ active ↔ archived`; **BLOQUEADAS** `draft → archived` y `archived → draft`.
  - `status`: todas permitidas EXCEPTO `pending → done` directo (debe pasar por `in_progress`).
- `dueAt` opcional en `draft`; **REQUERIDO** al transicionar a `active`.
- Autorización: sólo `member.role ∈ { admin, owner }` de la organización activa puede crear/editar/transicionar tareas.
- Cualquier admin/owner de la organización puede ver y administrar TODAS las tareas de esa organización, no sólo las propias.
- Acción "Tomar posesión": otro admin/owner puede reasignar `authorId` a sí mismo (útil cuando el autor pierde el rol o sale de la org).
- Listado base de tareas con filtros por `visibility` y `status`.
- UI mínima en `/admin` (panel de administración de organización) con copy en español neutral (tú).

## Capabilities

### New Capabilities

- `tasks-core`: modelo de tarea por organización, CRUD de autor/admin, transiciones de `visibility` y `status`, listado filtrable y acción de tomar posesión. Sin asignaciones, documentos, comentarios, checklist ni enforcement de plazo (esas vienen en propuestas futuras).

### Modified Capabilities

<!-- Ninguna. La entidad `Task` es nueva y no altera requirements de specs existentes. -->

## Impact

- **DB (Drizzle + Postgres)**: nueva tabla `task` con índices por `organizationId` y `authorId`, CHECK constraints para enums, migración correspondiente.
- **Schema export**: `next-app/lib/db/schema/task.ts` + reexport en `next-app/lib/db/schema/index.ts`.
- **Server actions**: nuevo módulo `next-app/lib/tasks/actions.ts` (o similar) con `createTask`, `updateTaskContent`, `transitionVisibility`, `transitionStatus`, `claimAuthorship`.
- **Autorización**: helper para verificar `member.role ∈ {admin, owner}` para la org activa de la sesión (reusa primitivas de Better Auth org plugin).
- **Rutas/UI**: páginas/sub-vistas bajo `/admin/tasks` (listado + form de creación/edición). Sin tocar shells `/account/*`, `/super/*`, `/app/*` ya existentes salvo enlace de navegación en `appSidebarConfig` del panel admin.
- **Fuera de alcance**: asignaciones a otros usuarios, comentarios, documentos adjuntos, checklist, enforcement automático de plazo (todas como cambios futuros).
- **Dependencias**: `account-shell` y organización (Better Auth org plugin) ya presentes; no se agregan paquetes nuevos.
