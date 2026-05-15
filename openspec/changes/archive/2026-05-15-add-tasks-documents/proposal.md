## Why

Las tareas hoy permiten texto (detalle + comentarios) pero no adjuntar evidencia binaria (contratos, planillas, presentaciones, ZIPs). Sin un canal oficial, los usuarios terminan compartiendo archivos por fuera del sistema, lo que rompe trazabilidad y auditoría dentro de la organización. Esta propuesta cierra ese hueco completando el ciclo de colaboración por tarea iniciado en `add-task-comments` y `add-tasks-inbox-and-admin-edit`.

## What Changes

- Nueva capability `task-documents`: modelo `TaskDocument`, server actions de upload/download/delete, y panel UI bajo un tab nuevo "Documentos" en `TaskDetailPane`.
- Nueva tabla `task_document` con `id`, `taskId` (FK CASCADE), `uploaderId` (FK SET NULL), `fileName`, `mimeType`, `sizeBytes`, `storageKey` (UNIQUE), `createdAt`, e índice `(taskId, createdAt)`.
- Lista cerrada de tipos permitidos: pdf, doc/docx, xls/xlsx, ppt/pptx, zip; validados server-side por MIME declarado + extensión coherente. Tamaño máximo: 25 MB por archivo.
- Almacenamiento en un **nuevo bucket privado R2** (`R2_DOCUMENTS_BUCKET`, NUEVA variable de entorno). Los logos siguen en el bucket público existente; el módulo `lib/storage/r2.ts` se extiende con `uploadPrivateAsset`, `getPresignedDownloadUrl` y `deletePrivateAsset` parametrizados por bucket.
- Descargas vía presigned GET URL con TTL 5 min y `ResponseContentDisposition: attachment; filename="{nombre original}"` para preservar el nombre humano (el key es UUID).
- Permisos de subir/descargar: autor de la tarea, responsable, asignados y admin/owner de la org, sujetos a la misma regla de visibilidad usada por `task-comments`.
- Permisos de eliminar: autor de la tarea borra cualquier doc, admin/owner borra cualquier doc, los demás participantes solo los suyos. Eliminación es hard-delete (R2 primero, fila DB después).
- `TaskCapabilities` suma `canUploadDocument: boolean`; cada fila de doc viaja al cliente con `canDelete: boolean` precalculado server-side.
- `deleteTask` (en `tasks-core`) suma un paso previo: listar `task_document` por taskId y borrar los blobs en R2 best-effort antes del DELETE de la tarea, para evitar blobs huérfanos cuando se elimina la tarea.

## Capabilities

### New Capabilities

- `task-documents`: modelo `TaskDocument`, autorización para subir/descargar/eliminar documentos sobre una tarea, validación de tipos y tamaños, presigned downloads, panel UI con tab "Documentos" en el detalle de la tarea y proyección de `canDelete` por fila.

### Modified Capabilities

- `r2-storage`: el módulo gana primitivas para buckets privados (`uploadPrivateAsset`, `getPresignedDownloadUrl`, `deletePrivateAsset`) parametrizadas por bucket, y una nueva variable `R2_DOCUMENTS_BUCKET` (sin `PUBLIC_BASE_URL` asociada).
- `tasks-core`: `deleteTask` debe eliminar los blobs R2 de los documentos de la tarea antes de la cascada del DELETE.

## Impact

- **DB**: nueva tabla `task_document` y migración Drizzle; ningún ALTER sobre `task`.
- **Código**: `lib/storage/r2.ts` (extender), `lib/db/schema/task.ts` (sumar tabla), `lib/tasks/` (nuevo módulo `documents.ts` + `document-actions.ts` + `queries.ts` ampliado para precalcular `canDelete`), `lib/tasks/capabilities.ts` (sumar `canUploadDocument`), `lib/tasks/actions.ts` (`deleteTask` limpia R2), `components/tasks/task-detail-pane.tsx` (tab nuevo) y nuevo `components/tasks/task-documents-panel.tsx`.
- **Env**: nueva variable `R2_DOCUMENTS_BUCKET`; documentar en `.env.example`. El operador crea el bucket privado en R2 (acceso público deshabilitado) con las mismas credenciales del account existente.
- **Dependencias**: agregar `@aws-sdk/s3-request-presigner` para firmar URLs.
- **APIs externas**: ninguna nueva fuera de R2.
- **UX**: aparece un tercer tab "Documentos (N)" en el detalle de la tarea; contador análogo al de comentarios.
- **No-impacto**: `task-comments` y la lógica de logos públicos quedan intactas.
