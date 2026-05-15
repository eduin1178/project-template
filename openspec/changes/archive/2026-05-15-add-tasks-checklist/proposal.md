## Why

Las tareas ya soportan texto descriptivo, comentarios y documentos, pero no permiten descomponer el trabajo en pasos accionables y marcables. Sin un checklist nativo, los equipos terminan listando "to-dos" como bullets en la descripción o como comentarios, perdiendo la posibilidad de tildar avance, ver progreso de un vistazo y dejar trazabilidad de quién completó cada paso. Esta propuesta cierra el último hueco del ciclo de colaboración por tarea iniciado en `add-task-comments` y completado por `add-tasks-documents`.

## What Changes

- Nueva capability `task-checklist`: modelo `TaskChecklistItem`, server actions de crear/editar label/togglear/eliminar items, y bloque inline en el tab "Detalle" de `TaskDetailPane` debajo de la descripción.
- Nueva tabla `task_checklist_item` con `id` (PK), `taskId` (FK CASCADE), `label` (1–200 chars), `checked` (bool, default false), `checkedById` (FK `user.id` SET NULL, nullable), `checkedAt` (timestamp, nullable), `createdAt`, `updatedAt`, e índice `(taskId, createdAt)`.
- Autorización para mutar items determinada por la `visibility` de la tarea:
  - `draft` → solo `authorId` + admin/owner de la org.
  - `active` → cualquier viewer con visibilidad sobre la tarea (admin/owner, autor, responsable, assignees).
  - `archived` → nadie.
- Las cuatro operaciones (crear, editar label, togglear, eliminar) comparten el mismo gate; no se separa "definir items" de "marcar items".
- Toggle idempotente: re-marcar/destogglear el mismo estado es no-op silencioso. Al togglear se persiste `checkedById` (viewer) y `checkedAt` (now); al destogglear ambos vuelven a `NULL`.
- `TaskCapabilities` suma `canManageChecklist: boolean` calculado server-side. La UI usa este flag para mostrar checkboxes interactivos, edición inline de label, botón eliminar e input "+ agregar item".
- Si el viewer NO tiene `canManageChecklist` pero hay items, el panel se renderiza en modo solo-lectura. Si no hay items y no puede gestionar, el bloque no se renderiza para no agregar ruido.
- `checkedById`/`checkedAt` se persisten desde día 1 pero la UI v1 NO los muestra; quedan disponibles para una futura capability de actividad/timeline sin requerir migración.
- Orden de items: siempre por `createdAt ASC`. Sin campo `order` ni drag-and-drop reorder en v1.
- Borrar la tarea elimina el checklist por FK CASCADE. `deleteTask` en `tasks-core` NO requiere cambios (a diferencia de `task-documents` que limpiaba R2).
- Copy en español neutral con `tú` (no voseo).

## Capabilities

### New Capabilities

- `task-checklist`: modelo `TaskChecklistItem`, server actions de crear/editar/togglear/eliminar con autorización basada en visibility de la tarea, capability proyectada `canManageChecklist`, bloque inline en `TaskDetailPane` con interacción condicional, persistencia de auditoría de toggle (`checkedById`, `checkedAt`) sin exposición en UI v1.

### Modified Capabilities

<!-- Ninguna spec existente cambia comportamiento. La extensión de `TaskCapabilities` con `canManageChecklist` se realiza junto a `canComment` y `canUploadDocument` en el código que ya proyecta capabilities por tarea, sin modificar specs de capabilities previas. -->

## Impact

- **DB**: nueva tabla `task_checklist_item` con FKs a `task` y `user`, e índice `(taskId, createdAt)`. Nueva migración Drizzle. Sin ALTER sobre `task` ni otras tablas.
- **Código**:
  - `lib/db/schema/task.ts`: sumar tabla `taskChecklistItem` y relaciones.
  - `lib/tasks/checklist.ts` (nuevo): helpers de query (listar items por taskId).
  - `lib/tasks/checklist-actions.ts` (nuevo): server actions `createChecklistItem`, `updateChecklistItemLabel`, `toggleChecklistItem`, `deleteChecklistItem`.
  - `lib/tasks/capabilities.ts`: sumar `canManageChecklist` a `TaskCapabilities` y a la función que lo proyecta.
  - `lib/tasks/queries.ts`: cargar el checklist junto con el detalle de la tarea (sin paginación en v1).
  - `components/tasks/task-detail-pane.tsx`: renderizar `TaskChecklistPanel` inline debajo de la descripción en el tab "Detalle".
  - `components/tasks/task-checklist-panel.tsx` (nuevo): componente de presentación con modos editable / solo-lectura.
- **APIs externas**: ninguna. Sin R2, sin presigned URLs, sin dependencias nuevas.
- **Env**: sin variables nuevas.
- **UX**: aparece un bloque "Checklist" inline en el detalle de cada tarea cuando hay items o cuando el viewer puede gestionar. Sin tabs nuevos.
- **No-impacto**: `task-comments`, `task-documents`, `task-assignments` y el resto de `tasks-core` quedan intactos. `deleteTask` no requiere cambios (cascada DB maneja la limpieza).
