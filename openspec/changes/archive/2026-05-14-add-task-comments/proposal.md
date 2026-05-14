# add-task-comments

## Why

El detail pane de la tarea ya muestra título, descripción, equipo y estado, pero no hay forma de que los participantes conversen sobre la tarea. Hoy la coordinación se va a chats externos y se pierde el contexto. El placeholder `task-comments-placeholder.tsx` existe en el detail pane desde `add-tasks-inbox-and-admin-edit` y es el hueco que cierra este cambio.

Necesitamos un hilo de comentarios estilo chat:
- visible a todo el equipo de la tarea (admin/owner, autor, responsable, assignees),
- con eliminación responsable: el autor del comentario puede arrepentirse dentro de los primeros 60 minutos; admin/owner puede moderar sin límite temporal,
- con soft-delete que conserva el rastro ("Comentario eliminado por el autor." / "Comentario eliminado por {nombre del admin}."), no hard-delete.

## What Changes

- **Modelo `TaskComment`** en una tabla nueva `task_comment` con: `id`, `taskId` (FK a `task.id`, `ON DELETE CASCADE`), `authorId` (FK a `user.id`, `ON DELETE CASCADE`), `body` (texto), `createdAt`, `deletedAt` (nullable), `deletedByName` (texto nullable, snapshot), `deletedByEmail` (texto nullable, snapshot). Index sobre `(taskId, createdAt)`.
- **Server actions**:
  - `createComment(taskId, body)`: valida que el invocador tenga `canViewTask` sobre la tarea, que `body` esté trimeado y no vacío, y que su longitud no exceda 2000 caracteres. Plain text (sin markdown ni HTML). Persiste con `createdAt = now()`. Permitido en `draft`, `active` y `archived` (consistente con la regla "si puedes ver la tarea, puedes comentarla").
  - `deleteComment(commentId)`: soft-delete. Autoriza si: (a) el invocador es `comment.authorId` Y `now - createdAt < 60 min`, O (b) el invocador es `admin`/`owner` de la organización de la tarea (sin límite temporal). En éxito, persiste `deletedAt = now()`, `deletedByName = invoker.name`, `deletedByEmail = invoker.email`. El `body` original se conserva en DB pero la UI lo oculta.
- **Lectura**: el server component del detail pane fetchea los comentarios junto con el detalle de la tarea (mismo round-trip, join sobre `task_comment` ordenado por `createdAt ASC`). No hay endpoint separado de listado en v1.
- **UI tipo chat** en `components/tasks/task-comments-panel.tsx` (reemplaza el placeholder actual):
  - Inline al final del `TaskDetailPane`, debajo del bloque de equipo.
  - Lista cronológica ASC. Cada comentario muestra avatar + nombre del autor, timestamp relativo, y body.
  - Comentarios eliminados renderizan placeholder en lugar de body:
    - Si `deletedByEmail === comment.author.email` → `"Comentario eliminado por el autor."`
    - Si `deletedByEmail !== comment.author.email` → `"Comentario eliminado por {deletedByName}."`
  - Botón "Eliminar" visible solo si capability `canDeleteComment(commentId)` es true en el render. Para el autor del comentario, la capability se calcula como `now - createdAt < 60 min` server-side al renderizar; el servidor revalida en la action. No hay timer reactivo en cliente — si el usuario abre el menú a los 59:50 y la action llega a los 60:01, la action falla con mensaje claro.
  - Composer al pie: `<Textarea>` multilínea pequeño (2-3 filas) con botón "Enviar". Enter envía, Shift+Enter inserta nueva línea. Deshabilitado si `!canComment`.
  - Sin paginación en v1.
- **Capabilities** se extienden en el objeto `TaskCapabilities` ya expuesto por las rutas:
  - `canComment: boolean` — igual a `canViewTask` (toda persona que ve la tarea puede comentar; `canViewTask` ya está implícito porque si el viewer no puede ver, no llega al detail).
  - `canDeleteComment: (commentId) => boolean` o, más simple, cada comentario devuelve precalculado `canDelete: boolean` desde el server para no propagar identidad del viewer al cliente.

## Capabilities

### New Capabilities
- `task-comments`: comentarios en tareas con soft-delete, ventana de 60 min para el autor, moderación admin sin límite, render de placeholder al borrar con snapshot de quién eliminó.

### Modified Capabilities
- `task-assignments`: el contrato `TaskCapabilities` gana `canComment: boolean`. Cada comentario devuelto al cliente trae precalculado `canDelete: boolean` según las reglas de autorización descritas arriba.

## Impact

- **DB**:
  - Nueva tabla `task_comment` y migración Drizzle.
  - Nuevo archivo `next-app/lib/db/schema/task-comment.ts` (o agregado a `task.ts` siguiendo el patrón de `taskAssignee`).
  - `next-app/lib/db/schema/index.ts`: exporta el nuevo schema.
- **Server actions**: nuevo archivo (probablemente) `next-app/app/admin/tasks/_actions/comments.ts` o, mejor, `next-app/lib/tasks/comment-actions.ts` reutilizable desde `/admin/tasks` y `/tasks`. Define `createComment` y `deleteComment`.
- **Lectura**: extender el loader del detail pane (donde sea que se obtenga el detalle de la tarea en server component) para incluir `comments` con join a `user` (para nombre/email/avatar del autor) y precálculo de `canDelete` por fila.
- **UI**:
  - Nuevo `next-app/components/tasks/task-comments-panel.tsx`.
  - Eliminar `next-app/components/tasks/task-comments-placeholder.tsx`.
  - `task-detail-pane.tsx`: reemplaza el placeholder por el panel real.
- **Tipos**: extender `TaskCapabilities` (`canComment`) y definir `TaskCommentView` con `canDelete` y los campos de soft-delete proyectados.
- **Copy**: todo en español neutral en segunda persona `tú` (Comenta, Envía, Elimina). Placeholders exactos: "Comentario eliminado por el autor." y "Comentario eliminado por {nombre}.".

## Open Questions

Ninguna abierta para v1. Futuras propuestas pueden agregar: edición de comentarios, menciones, adjuntos, paginación, hard-delete con confirmación, reacciones.
