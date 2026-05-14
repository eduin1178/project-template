## Why

`tasks-core` dejó las tareas como un objeto compartido por toda la organización pero gestionado exclusivamente por admin/owner: los members no tenían forma de participar y no había noción de "a quién le toca esta tarea". Esto convierte al modelo en un catálogo administrativo y no en una herramienta de delegación. Necesitamos introducir el responsable y el equipo de apoyo, y reglas de visibilidad que permitan a un member ver las tareas en las que efectivamente participa, sin abrirle el resto del panel de administración.

## What Changes

- Agregar `task.responsibleId` (nullable, FK a `user.id`, `onDelete SET NULL`).
- Agregar tabla `task_assignee (taskId, userId)` con PK compuesta y `onDelete CASCADE` en ambas FKs; índice por `userId`.
- Server actions nuevas para autor o admin/owner: `setResponsible`, `clearResponsible`, `addAssignee`, `removeAssignee`. Todas validan que el usuario referenciado sea member de la organización de la tarea y que responsable y assignees sean conjuntos disjuntos.
- **BREAKING** Activar (transición `draft → active`) ahora exige `dueAt` Y `responsibleId`. Tareas existentes en `active` sin responsable son válidas (sin migración retroactiva forzada), pero cualquier nueva activación o re-activación requiere ambos.
- **BREAKING** Editar `title`/`description`: solo el autor mientras la tarea esté en `draft`, O cualquier admin/owner en cualquier visibility. Antes (`tasks-core`) cualquier admin/owner editaba en cualquier visibility sin restricción para el autor.
- **BREAKING** Editar `dueAt`: solo admin/owner, y solo si `visibility ∈ {draft, active}`. Nunca en `archived`.
- Agregar acción `deleteTask`: el autor o cualquier admin/owner puede eliminar, solo si `visibility = 'draft'`.
- **BREAKING** Listado y lectura ya no son admin-only:
  - admin/owner ven todas las tareas de su org (sin cambios respecto a `tasks-core`).
  - member ve una tarea solo si `visibility = 'active'` Y el member ∈ {author, responsible, assignees}. Drafts y archivadas nunca son visibles a un member.
- Ruta nueva `/tasks` (accesible a cualquier rol con `activeOrganizationId`): vista read-only "mis tareas activas".
- Enriquecer `/admin/tasks` con UI de gestión de responsable + assignees y botón eliminar (solo si draft).
- Componentes presentacionales compartidos por ambas rutas; las rutas calculan `capabilities` (`canEdit`, `canDelete`, `canClaim`, `canTransition`, `canManageTeam`) por tarea según el rol del viewer.

## Capabilities

### New Capabilities
- `task-assignments`: modelo de responsable y equipo de apoyo (assignees), invariantes de pertenencia a la organización, regla de disyunción responsable/assignees, y reglas de visibilidad por rol que abren lectura a members. Incluye la ruta `/tasks` para la vista de "mis tareas activas".

### Modified Capabilities
- `tasks-core`: cambian los requirements de edición de contenido (autor en draft o admin siempre), edición de `dueAt` (prohibida en archived), activación (exige `responsibleId` además de `dueAt`), autorización de listado/lectura (deja de ser admin-only), y se agrega borrado en draft.

## Impact

- **Schema**: `next-app/lib/db/schema/task.ts` (agrega `responsibleId`, relación nueva); nuevo archivo de tabla `task_assignee`; migración Drizzle nueva.
- **Lib**: `next-app/lib/tasks/queries.ts` (nueva query `listTasksForMember`, ajuste de queries existentes para resolver responsable y assignees), `actions.ts` (nuevas acciones de gestión de equipo y `deleteTask`; refactor de `transitionVisibility` y `updateTaskContent` para nuevas reglas), `schemas.ts`, `transitions.ts`.
- **Guards**: `next-app/lib/auth/guards.ts` necesita un `requireOrgMember()` (o equivalente) para proteger `/tasks` y las queries de member.
- **Rutas/UI**: nueva ruta `next-app/app/tasks/`, refuerzos en `next-app/app/admin/tasks/`, componentes en `next-app/components/tasks/` con props de `capabilities`.
- **API/contratos**: el contrato `TaskListItem` se extiende con `responsibleId`, `responsibleName`, `responsibleEmail`, `assignees: { userId, name, email }[]`. Consumidores existentes (solo admin) deben tolerar los campos nuevos.
- **Sin migración retroactiva** de tareas ya activas sin responsable: quedan visibles para admins; cualquier nueva transición a `active` requerirá `responsibleId`.
