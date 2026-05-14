## Why

`add-tasks-assignments-and-visibility` abrió la lectura de tareas a los members con la ruta `/tasks` y dejó listas las server actions de edición de contenido (`updateTaskContent`), pero la UI quedó incompleta:

- `/tasks` se renderiza como una lista de cards en `max-w-3xl`, mientras que `/admin/tasks` usa un shell tipo bandeja de entrada (filtros | lista | detalle). El member tiene una experiencia visual distinta y empobrecida frente al admin.
- El sidebar de `/app` no expone la entrada al área de tareas, así que el member tiene que conocer la URL.
- `updateTaskContent` existe en el server y respeta las reglas (autor en draft, admin/owner en cualquier visibility; `dueAt` solo admin/owner y nunca en archived), pero ningún componente la llama: no hay forma de editar título, descripción ni plazo desde la UI.
- El `<Textarea>` del diálogo de creación es muy chico (4 filas) para descripciones reales y, en el panel de detalle, las descripciones largas hacen scroll del panel entero y pierden el header con el título y los badges.

Este cambio cierra esos huecos sin tocar el modelo de datos ni las reglas ya archivadas.

## What Changes

- Mover los componentes de `next-app/app/admin/tasks/_components/` a `next-app/components/tasks/` para que ambas rutas consuman el mismo shell.
- Introducir el contrato `TaskCapabilities` (`canEditContent`, `canEditDueAt`, `canManageTeam`, `canTransitionVisibility`, `canTransitionStatus`, `canDelete`, `canClaim`) calculado server-side por cada ruta según el rol y la relación del viewer con la tarea (autor, responsable, assignee, admin/owner).
- **BREAKING (UI)** Reescribir `app/tasks/page.tsx` para usar el mismo shell de tres paneles que `/admin/tasks`, con filtros reducidos a `status` (sin `visibility`, porque el member solo ve `active`) y sin `CreateTaskDialog`. Drop de la subruta `app/tasks/[taskId]/page.tsx`; el deep-link pasa a `/tasks?taskId=...` (la ruta vieja redirige 308).
- Capabilities aplicadas en los componentes compartidos: las acciones de status (`pending → in_progress → done` y reabrir) quedan habilitadas para autor, admin/owner, responsable y assignees. Las acciones de visibility (activar, archivar, reactivar) y delete quedan solo para autor y admin/owner según las reglas ya archivadas. `claimAuthorship` queda para autor distinto del current user y para responsable/assignees, igual que hoy.
- Agregar entrada "Tareas" → `/tasks` en `components/layout/contexts/app.ts` con `ListChecksIcon`, espejando al sidebar admin.
- Agregar `EditTaskDialog` (componente separado de `CreateTaskDialog`) en `components/tasks/edit-task-dialog.tsx` y un botón "Editar" en el header del detail pane. El dialog edita `title`, `description` y `dueAt`, deshabilitando campos según `capabilities`. Llama a `updateTaskContent`.
- Agrandar el `<Textarea>` de descripción tanto en `CreateTaskDialog` como en `EditTaskDialog` (mínimo 8 filas, `resize-y`, `max-h-[400px]`).
- En `TaskDetailPane`, sticky header/badges/action-bar y body de descripción con `flex-1 overflow-y-auto` para que solo la descripción scrollee.

## Capabilities

### New Capabilities
- ninguna; este cambio es UI/UX puro.

### Modified Capabilities
- `task-assignments`: agrega la ruta `/tasks` con shell tipo bandeja de entrada (filtros por status, lista, detail pane) y unifica los componentes presentacionales entre admin y member; introduce el contrato `TaskCapabilities` que las rutas calculan según rol y relación con la tarea, y extiende `canTransitionStatus` a responsable y assignees.
- `tasks-core`: agrega la UI de edición de `title`, `description` y `dueAt` (botón "Editar" + dialog) que invoca `updateTaskContent` con las mismas reglas ya archivadas.

## Impact

- **Rutas/UI**:
  - `next-app/app/tasks/page.tsx`: reemplazado por shell de tres paneles que reutiliza `TasksFiltersPanel`, `TasksListPanel`, `TaskDetailPane`. Recibe `capabilities` por tarea seleccionada.
  - `next-app/app/tasks/[taskId]/page.tsx`: convertido en redirect 308 a `/tasks?taskId=...` (o eliminado y manejado en `proxy.ts` si fuera necesario).
  - `next-app/app/admin/tasks/page.tsx`: actualiza imports al nuevo path compartido; sin cambio funcional.
  - `next-app/components/layout/contexts/app.ts`: agrega item "Tareas".
- **Componentes**:
  - Movidos a `next-app/components/tasks/`: `tasks-filters-panel.tsx`, `tasks-list-panel.tsx`, `task-detail-pane.tsx`, `task-detail-actions.tsx`, `task-row-actions.tsx`, `task-team-summary.tsx`, `task-assignees-panel.tsx`, `task-comments-placeholder.tsx`. `task-card.tsx` y `task-readonly-list.tsx` ya están ahí; `task-readonly-list.tsx` queda obsoleto y se elimina.
  - Nuevos: `next-app/components/tasks/edit-task-dialog.tsx`, `next-app/components/tasks/capabilities.ts` (tipo y helper de cálculo server-side).
  - `CreateTaskDialog` se mueve a `components/tasks/create-task-dialog.tsx` para mantener el dominio agrupado.
- **Server**:
  - Sin cambios al schema, queries ni actions. `updateTaskContent` ya implementa las reglas.
  - Si `listTasksForMember` no devuelve hoy todos los campos que pide el detail pane (asegurar paridad con `listTasks`), ajustar para igualar la forma. A confirmar en la fase de specs/design.
- **Contrato UI**: `TaskCapabilities` documentado en `components/tasks/capabilities.ts`; consumido por todos los componentes que renderizan acciones.
- **Tamaño esperado**: 500–700 líneas. Single PR con `size:exception` según preferencia del usuario.
- **Sin migraciones de datos**.
- **Markdown editor / renderer**: explícitamente fuera de alcance. Tracked para un cambio futuro.
