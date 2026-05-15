## Why

Hoy una tarea con `dueAt` vencido sigue comportándose igual que una en plazo: responsables y equipo de apoyo pueden seguir modificando checklist, subir o eliminar documentos, y cambiar el `status` sin dejar rastro de por qué. El plazo es decorativo, no operativo. Esta propuesta convierte `dueAt` en un disparador de enforcement: al vencer, la tarea se "congela" para los participantes que son member regular, dejando solo el canal de comentarios abierto y forzando a admins o autores a destrabarla (extendiendo el plazo, archivando, o cerrando). Además, todo cambio de `status` queda atado a un comentario justificativo de al menos 30 caracteres, generando trazabilidad nativa del avance.

Continúa el ciclo iniciado por `add-tasks-core`, `add-tasks-assignments-and-visibility`, `add-task-comments`, `add-tasks-documents` y `add-tasks-checklist`.

## What Changes

### Enforcement de `dueAt` vencido

- Una tarea SHALL considerarse "vencida" cuando `dueAt <= now()` evaluado server-side con la hora del servidor; sin gracia, sin tolerancia por zona horaria del cliente.
- Al vencer, las siguientes operaciones SHALL ser rechazadas para `member` regular (autor o no autor):
  - mutar checklist (crear, editar label, togglear, eliminar)
  - adjuntar nuevo documento
  - eliminar documento propio
  - eliminar comentario propio
  - cambiar `status`
- La excepción es por **rol**: `admin`/`owner` de la organización mantienen todas sus capacidades sobre la tarea (incluyendo `status`, checklist, documentos, edición de `dueAt`). El **autor** de la tarea, aunque sea `member` regular, también mantiene sus capacidades (puede seguir editando el checklist si la tarea fuera draft — caso teórico — pero NO recupera capacidades reservadas a admin como editar `dueAt`).
- Comentar permanece abierto para todos los que ya podían comentar (regla de visibilidad de `task-assignments` intacta).

### Cambio de `status` por responsable miembro

- El responsable de tipo `member` regular (no admin/owner) SHALL poder cambiar el `status` solo si la tarea NO está vencida.
- El responsable que es admin/owner SHALL poder cambiar el `status` sin importar el vencimiento (es bypass por rol).
- El autor de tipo `member` regular SHALL poder cambiar el `status` sin importar el vencimiento (es bypass por autoría).
- Los assignees de tipo `member` regular SHALL perder la capacidad de cambiar `status` al vencer, salvo que coincidan con el autor o tengan rol admin/owner.

### Comentario obligatorio en cambio de `status`

- Toda operación de cambio de `status` SHALL aceptar un `commentBody` requerido cuyo contenido, tras `trim`, tenga al menos 30 caracteres y a lo sumo 2000.
- La operación SHALL ser atómica: en una sola transacción, se inserta una fila en `task_comment` con el `body` provisto y se actualiza `task.status`. Si la inserción del comentario falla la transición SHALL revertirse.
- La regla aplica a todos los invocadores que cambian `status`, incluyendo `admin`/`owner`. La justificación es trazabilidad; el rol no exime.
- El comentario insertado SHALL ser un comentario común en el feed (mismo modelo `task_comment` ya existente), no un evento separado.

### Default de `dueAt` en `CreateTaskDialog`

- El form de creación SHALL precargar el campo `dueAt` con `now()` del servidor + 7 días, fijado a las 18:00 en la zona horaria del servidor. El valor por defecto se calcula al renderizar el dialog en el server.
- El usuario puede sobrescribir o limpiar el valor antes de enviar. El comportamiento server-side de `dueAt` opcional en draft no cambia.
- `EditTaskDialog` NO precarga ningún default; muestra el valor actual o vacío si está en `NULL`.

### Capabilities proyectadas

Se extiende el contrato `TaskCapabilities` con flags adicionales calculados server-side por tarea visible:

- `canChangeStatus: boolean` — true si el viewer puede cambiar `status` de la tarea (combina rol + autoría + responsabilidad + assignee + estado de vencimiento).
- `canManageChecklist` (ya existe): SHALL incorporar la regla de vencimiento (false para `member` regular si la tarea está vencida, true para admin y autor).
- `canUploadDocument` (ya existe): mismo tratamiento.
- `canDeleteOwnDocument` (proyección por documento, ya existe en `task-documents`): mismo tratamiento.
- `canDeleteOwnComment` (proyección por comentario, ya existe en `task-comments`): mismo tratamiento.
- `canComment` (ya existe): NO se modifica — comentar permanece abierto al vencer.

La UI lee estas flags. NO inspecciona `dueAt` para decidir habilitar/ocultar acciones.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `tasks-core`: cambio en la transición de `status` (server action atómica con comentario obligatorio), comparación de `dueAt` server-side, default `dueAt` en `CreateTaskDialog`.
- `task-assignments`: refinamiento de qué viewer puede cambiar `status` (bypass por admin/owner y por autoría sobre la regla de vencimiento), nueva capability `canChangeStatus` en el contrato.
- `task-checklist`: gate de vencimiento sobre las cuatro operaciones de mutación, con bypass por rol y autoría.
- `task-documents`: gate de vencimiento sobre `uploadTaskDocument` y sobre la eliminación de documento propio, con bypass por rol y autoría.
- `task-comments`: gate de vencimiento sobre la eliminación de comentario propio del autor del comentario (no sobre crear comentario), con bypass por rol y autoría sobre la tarea.

## Impact

- **DB**: ninguna migración. Toda la lógica vive en server actions; la comparación `dueAt <= now()` se evalúa en runtime contra `NOW()` de Postgres (o `new Date()` de Node, indistinto siempre que sea server).
- **Código**:
  - `lib/tasks/actions.ts` (o equivalente): nueva server action `changeTaskStatus(taskId, newStatus, commentBody)` que ejecuta inserción de comentario + update de status en una transacción. Las acciones antiguas tipo `transitionStatus` SHALL ser reemplazadas o envueltas para forzar `commentBody`.
  - `lib/tasks/capabilities.ts`: extender la proyección para incluir `canChangeStatus`, incorporar regla de vencimiento en `canManageChecklist`, `canUploadDocument`, `canDeleteOwnDocument`, `canDeleteOwnComment`.
  - `lib/tasks/checklist-actions.ts`: enforcement de vencimiento.
  - `lib/tasks/document-actions.ts`: enforcement de vencimiento en upload y delete propio.
  - `lib/tasks/comment-actions.ts`: enforcement de vencimiento en delete propio del autor.
  - `components/tasks/create-task-dialog.tsx`: precargar `dueAt` con `now + 7d @ 18:00 server`.
  - `components/tasks/task-detail-pane.tsx`: render del diálogo de cambio de status con textarea obligatorio (min 30 chars).
  - `components/tasks/change-status-dialog.tsx` (nuevo): UI del cambio de status con comentario obligatorio.
- **APIs externas**: ninguna.
- **Env**: sin variables nuevas.
- **UX**:
  - El default `dueAt` reduce fricción al crear tareas: el usuario casi nunca tiene que abrir el datepicker.
  - El diálogo de cambio de status agrega un paso (escribir comentario), pero genera trazabilidad valiosa.
  - Para member regular, una tarea vencida muestra solo el panel de comentarios habilitado; el resto aparece en solo-lectura.
- **Tareas legacy**: tareas creadas antes de este cambio que estén vencidas SHALL respetar las nuevas reglas a partir del deploy. NO hay backfill ni estado nuevo persistido — la "congelación" es derivada en runtime.
- **No-impacto**: la regla de visibilidad por rol (`task-assignments`) NO cambia. La edición de contenido (`title`, `description`) y la edición de `dueAt` ya estaban restringidas a admin/owner; el vencimiento no agrega restricción nueva ahí.
