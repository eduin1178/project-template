/opsx:explore 


## Propuesta 3 — `add-tasks-comments`

**Objetivo:** Agregar comentarios a la tarea, visibles para todo el equipo de la tarea, con soft-delete.

**Alcance:**
- Modelo `TaskComment` con `taskId`, `authorId`, `body`, `createdAt`, `deletedAt?`, `deletedByAuthor: boolean`.
- Quién puede comentar: admin, autor, responsable, asignados.
- Eliminación:
  - Solo el autor del comentario puede eliminarlo.
  - Solo si han pasado menos de 60 minutos desde `createdAt`.
  - Soft-delete: no se borra el registro; en UI se renderiza `"Comentario eliminado por el autor."`.
- Visibilidad de comentarios: todos los participantes de la tarea.

Esto es continuacion de add-tasks-inbox-and-admin-edit