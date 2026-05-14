## 1. Schema y migración

- [x] 1.1 Agregar tabla `taskComment` a `next-app/lib/db/schema/task.ts` con columnas `id`, `taskId`, `authorId`, `body`, `createdAt`, `deletedAt`, `deletedByName`, `deletedByEmail` y FKs con `ON DELETE CASCADE` sobre `task.id` y `user.id`
- [x] 1.2 Agregar índices `task_comment_task_id_created_at_idx` (compuesto sobre `taskId, createdAt`) y `task_comment_author_id_idx`
- [x] 1.3 Agregar `taskCommentRelations` (author → user, task → task) en el mismo archivo
- [x] 1.4 Exportar `taskComment` y `taskCommentRelations` desde `next-app/lib/db/schema/index.ts`
- [x] 1.5 Generar migración con `drizzle-kit generate` y verificar el SQL resultante (create table + indexes + FKs con cascade)

## 2. Capa de dominio

- [x] 2.1 Crear `next-app/lib/tasks/comments.ts` con la constante `COMMENT_EDIT_WINDOW_MINUTES = 60` y un helper `isWithinEditWindow(createdAt: Date): boolean`
- [x] 2.2 Extender `next-app/lib/tasks/schemas.ts` con `createCommentSchema` (taskId, body trimeado min 1, max 2000) y `deleteCommentSchema` (commentId)
- [x] 2.3 Extraer (si no existe) un helper `assertCanViewTask({ taskId, viewer })` reusando la regla de visibilidad de `queries.ts` para que `createComment` la consuma sin duplicar lógica

## 3. Queries de lectura

- [x] 3.1 Agregar tipo `TaskCommentView` en `next-app/lib/tasks/queries.ts` (id, taskId, authorId, authorName, authorEmail, authorImage, body nullable, createdAt, deletedAt, deletedByName, deletedByEmail, canDelete)
- [x] 3.2 Implementar `listCommentsForTask(taskId, viewer)` en `queries.ts`: join `task_comment` con `user` sobre `authorId`, ordenado por `createdAt ASC`, sin paginación
- [x] 3.3 Precalcular `canDelete` por fila en `listCommentsForTask` con la regla `admin/owner siempre || (autor && now-createdAt < 60min)` y forzar `false` si `deletedAt != null`
- [x] 3.4 Proyectar `body = null` en el resultado cuando `deletedAt != null` para que el body original NO viaje al cliente

## 4. Capabilities

- [x] 4.1 Agregar campo `canComment: boolean` al tipo `TaskCapabilities` en `next-app/lib/tasks/capabilities.ts`
- [x] 4.2 Ampliar el parámetro `task` de `computeCapabilities` a `Pick<TaskListItem, "authorId" | "visibility" | "responsibleId" | "assignees">`
- [x] 4.3 Implementar `canComment = isAdmin || (visibility === 'active' && (isAuthor || isResponsible || isAssignee))`
- [x] 4.4 Actualizar `readOnlyCapabilities()` para retornar `canComment: false`
- [x] 4.5 Actualizar todos los callers de `computeCapabilities` para pasar el `task` con `responsibleId` y `assignees` (rutas `/admin/tasks`, `/tasks`, y el row-level cálculo en list panels)

## 5. Server actions

- [x] 5.1 Crear `next-app/lib/tasks/comment-actions.ts` con `"use server"` y los imports de guards, db, schemas, `revalidatePath`
- [x] 5.2 Implementar `createComment(input)`: validar con `createCommentSchema`, llamar `requireOrgMember` + `assertCanViewTask`, insertar fila con `id = randomUUID()`, `createdAt = now()`, retornar `{ ok: true, data: { commentId } }`; revalidate `/admin/tasks` y `/tasks`
- [x] 5.3 Implementar `deleteComment(input)`: validar con `deleteCommentSchema`, cargar comentario + task, autorizar (admin/owner siempre || autor con `isWithinEditWindow`); si autorizado: si ya está deleted retornar idempotente, si no setear `deletedAt = now()`, `deletedByName = user.name`, `deletedByEmail = user.email`; revalidate paths
- [x] 5.4 Manejar el caso "ventana expirada al llegar al servidor" retornando `{ ok: false, error: "La ventana de eliminación de 60 minutos expiró." }`

## 6. UI: panel de comentarios

- [x] 6.1 Crear `next-app/components/tasks/task-comments-panel.tsx` con props `{ taskId, comments: TaskCommentView[], canComment: boolean }`
- [x] 6.2 Renderizar lista cronológica ASC: avatar (shadcn `<Avatar>` con fallback de iniciales), nombre del autor, timestamp relativo, body con `whitespace-pre-wrap`
- [x] 6.3 Implementar helper local de timestamp relativo basado en `Intl.RelativeTimeFormat('es')` y `setInterval` de 60s para auto-actualizar
- [x] 6.4 Renderizar comentarios eliminados con el placeholder correcto: si `deletedByEmail === comment.authorEmail` → `"Comentario eliminado por el autor."`, sino → `"Comentario eliminado por {deletedByName}."`
- [x] 6.5 Renderizar botón "Eliminar" en cada fila si `comment.canDelete === true`; al click llamar `deleteComment({ commentId })` y `router.refresh()` tras éxito
- [x] 6.6 Renderizar composer al pie con `<Textarea rows={2} className="resize-y max-h-30">` y botón "Enviar" (Phosphor `PaperPlaneRight`)
- [x] 6.7 Handlers de teclado en el textarea: Enter envía (preventDefault), Shift+Enter inserta `\n`
- [x] 6.8 Submit del composer: llamar `createComment({ taskId, body })`, deshabilitar inputs durante la llamada, limpiar el textarea y `router.refresh()` tras éxito; mostrar error inline en caso de fallo
- [x] 6.9 Ocultar el composer cuando `canComment === false` (lectura sin escritura)
- [x] 6.10 Todo el copy en español neutral (`tú`), sin voseo: placeholders, botones, mensajes de error

## 7. Wire-up del detail pane

- [x] 7.1 Reemplazar el import y uso de `TaskCommentsPlaceholder` por `TaskCommentsPanel` en `next-app/components/tasks/task-detail-pane.tsx`
- [x] 7.2 Extender la firma del `TaskDetailPane` para aceptar `comments: TaskCommentView[]` además del `task` y `capabilities` ya existentes
- [x] 7.3 Pasar `canComment={capabilities.canComment}` al `TaskCommentsPanel`
- [x] 7.4 Eliminar el archivo `next-app/components/tasks/task-comments-placeholder.tsx`

## 8. Wire-up server-side de las páginas

- [x] 8.1 En `next-app/app/admin/tasks/page.tsx`, cuando hay `searchParams.taskId` y el viewer puede ver la tarea, invocar `listCommentsForTask(taskId, viewer)` y pasar el resultado al `TaskDetailPane`
- [x] 8.2 Mismo wire-up en `next-app/app/(app)/tasks/page.tsx` para member/admin que entren por `/tasks?taskId=...`
- [x] 8.3 Asegurar que la regla de visibilidad bloquea el fetch de comentarios cuando el viewer no puede ver la tarea (evitar exponer existencia)

## 9. Verificación manual

- [x] 9.1 Admin comenta en tarea draft, active y archived → comentarios persisten y aparecen en la lista
- [x] 9.2 Member responsable comenta en tarea active → persiste; intenta llamar `createComment` en draft (forzando) → falla con error de autorización
- [x] 9.3 Member que no participa NO ve la tarea ni el panel (regla de visibilidad ya cubre esto, verificar que sigue intacto)
- [x] 9.4 Autor borra su propio comentario a los <60 min → render `"Comentario eliminado por el autor."`; intenta borrar a los >60 min → action falla con mensaje claro
- [x] 9.5 Admin borra comentario ajeno antiguo → render `"Comentario eliminado por {nombre admin}."`; admin borra su propio comentario >60 min → ok (sin ventana)
- [x] 9.6 Body de comentario eliminado NO viaja al cliente (inspeccionar payload del server component)
- [x] 9.7 Enter envía, Shift+Enter inserta salto, body con saltos se renderiza con `whitespace-pre-wrap`
- [x] 9.8 Composer oculto para viewer sin `canComment` (caso forzado: pasar `canComment=false` y verificar render)
- [x] 9.9 Borrar la tarea (deleteTask en draft) elimina los comentarios en cascada (verificar en DB)
- [x] 9.10 Copy: ningún string con voseo (`Comentá`, `Enviá`, `Eliminá`, `Ingresá`, `vos`)
