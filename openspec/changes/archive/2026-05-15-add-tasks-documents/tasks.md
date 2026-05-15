## 1. Configuración previa

- [ ] 1.1 Crear bucket privado en Cloudflare R2 (acceso público deshabilitado) en cada ambiente y registrar su nombre como `R2_DOCUMENTS_BUCKET` *(manual — operador)*
- [ ] 1.2 Agregar entrada `R2_DOCUMENTS_BUCKET=` a `next-app/.env.example` con comentario indicando que es el bucket privado para documentos de tareas *(manual — archivo restringido por permisos del harness)*
- [x] 1.3 Instalar `@aws-sdk/s3-request-presigner` (peer compatible con el `@aws-sdk/client-s3` ya presente)
- [x] 1.4 Ajustar `next.config.ts` para fijar `serverActions.bodySizeLimit: "30mb"` (margen sobre los 25 MB del límite por archivo)

## 2. Módulo `lib/storage/r2.ts`

- [x] 2.1 Extraer la lectura de credenciales a una helper `requireR2Credentials()` que valida `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID` y `R2_SECRET_ACCESS_KEY` y deja `requireR2Config()` (público) construyendo sobre ella + `R2_BUCKET` + `R2_PUBLIC_BASE_URL`
- [x] 2.2 Agregar `uploadPrivateAsset({ key, body, contentType, bucket })` que ejecuta `PutObjectCommand` contra el `bucket` recibido (sin retornar URL pública); valida que el `bucket` no sea cadena vacía
- [x] 2.3 Agregar `deletePrivateAsset({ key, bucket })` que ejecuta `DeleteObjectCommand` contra el `bucket` recibido y propaga errores
- [x] 2.4 Agregar `getPresignedDownloadUrl({ key, bucket, expiresIn, downloadFilename })` usando `getSignedUrl` de `@aws-sdk/s3-request-presigner` con `GetObjectCommand`; setear `ResponseContentDisposition: attachment; filename="{sanitizado}"; filename*=UTF-8''{percent-encoded}` para preservar el nombre original
- [x] 2.5 Añadir helper `requireDocumentsBucket()` que lee `R2_DOCUMENTS_BUCKET` y lanza error con mensaje explícito si está ausente
- [ ] 2.6 Agregar tests de humo simples (mock S3Client) para confirmar que las nuevas funciones invocan los comandos correctos contra el bucket recibido por parámetro *(deferido — el proyecto aún no tiene framework de tests configurado)*

## 3. Schema y migración DB

- [x] 3.1 Agregar tabla `taskDocument` en `next-app/lib/db/schema/task.ts` con columnas `id`, `taskId` (FK `task.id` ON DELETE CASCADE), `uploaderId` (FK `user.id` ON DELETE SET NULL, nullable), `fileName`, `mimeType`, `sizeBytes` (integer), `storageKey` (text UNIQUE), `createdAt` (timestamptz default now)
- [x] 3.2 Declarar índice compuesto `(taskId, createdAt)` en la definición Drizzle
- [x] 3.3 Reexportar `taskDocument` desde `next-app/lib/db/schema/index.ts` *(automático: `index.ts` reexporta todo `./task`)*
- [x] 3.4 Generar migración con Drizzle Kit (`drizzle.config.ts`) y verificar el SQL resultante: CREATE TABLE, FKs con sus ON DELETE, UNIQUE en `storageKey`, índice compuesto — `lib/db/migrations/0005_dashing_beast.sql`

## 4. Validación de tipos y tamaño

- [x] 4.1 Crear `next-app/lib/tasks/documents.ts` exportando la constante `ALLOWED_DOCUMENT_TYPES` con la tabla canónica `(extensión → lista de MIME)` definida en el spec
- [x] 4.2 Exportar helper `validateDocumentInput({ fileName, mimeType, sizeBytes }): { ok: true, extension } | { ok: false, error }` que extrae la extensión del `fileName` (case-insensitive), valida contra la tabla y rechaza si `sizeBytes > 25 * 1024 * 1024`
- [x] 4.3 Exportar `MAX_DOCUMENT_SIZE_BYTES = 26214400` y `MAX_DOCUMENT_SIZE_LABEL = "25 MB"` para uso en UI y mensajes de error
- [x] 4.4 Exportar helper `buildTaskDocumentKey({ organizationId, taskId, extension })` que devuelve `task-documents/{orgId}/{taskId}/{uuid}.{ext}` (acepta también `uuid` por parámetro para que la action genere el UUID y la fila comparta el mismo identificador)

## 5. Schemas Zod y server actions

- [x] 5.1 Agregar en `next-app/lib/tasks/schemas.ts` los schemas `getDocumentDownloadUrlSchema` y `deleteDocumentSchema` (el upload viaja como `FormData` y se valida directamente en la action)
- [x] 5.2 Crear `next-app/lib/tasks/document-actions.ts` con `"use server"`. `uploadTaskDocument(formData)` parsea `taskId` + `file`, llama `requireOrgMember`, computa autorización contra `task`/`task_assignee` siguiendo la regla del spec, valida `validateDocumentInput`, genera UUID + `storageKey`, sube a R2 vía `uploadPrivateAsset`, inserta la fila con `uploaderId = viewer.id`, y revalida `/admin/tasks` y `/tasks`. Si la inserción DB falla tras subir, rollback best-effort del blob.
- [x] 5.3 `getTaskDocumentDownloadUrl({ documentId })` joinea `task_document` con `task`, valida org + autorización, firma con `expiresIn: 300` y `downloadFilename = doc.fileName`, retorna `{ ok: true, data: { url } }`
- [x] 5.4 `deleteTaskDocument({ documentId })` carga doc + tarea, valida que viewer es admin/owner O `task.authorId` O `doc.uploaderId`, primero `deletePrivateAsset` y solo si tiene éxito ejecuta `DELETE FROM task_document`; loggea + retorna error consistente en cada rama de fallo; revalida al éxito
- [x] 5.5 Inspección manual del módulo confirma que cada rama de error retorna `{ ok: false, error }` consistente con el patrón usado en `comment-actions.ts`

## 6. Capabilities y queries

- [x] 6.1 Extender `TaskCapabilities` en `components/tasks/capabilities.ts` (el archivo realmente usado por las pages) agregando `canUploadDocument`. `computeTaskCapabilities` ya conoce `isParticipant`, así que la regla queda `isAdmin || (visibility === "active" && isParticipant)`, igual que `canComment`.
- [ ] 6.2 Actualizar `readOnlyCapabilities` para incluir `canUploadDocument: false` *(N/A — `readOnlyCapabilities` solo existe en el `lib/tasks/capabilities.ts` muerto que ninguna página importa; el archivo activo no lo expone)*
- [x] 6.3 En `lib/tasks/queries.ts`, agregar `listDocumentsForTask({ taskId, viewerUserId, isAdmin, taskAuthorId })` que retorna `TaskDocumentView[]` con join a `user` (uploader) ordenados por `createdAt DESC`, proyectando `canDelete = isAdmin || viewer === taskAuthor || viewer === uploaderId`
- [x] 6.4 Integrar la carga de documentos en `/admin/tasks/page.tsx` y `/(app)/tasks/page.tsx`, en paralelo con `listCommentsForTask`, y pasarla al `TaskDetailPane`
- [x] 6.5 Trigger `Documentos (N)` agregado en `TaskDetailPane` con el mismo patrón de contador que `Comentarios`

## 7. Cascada en `deleteTask`

- [x] 7.1 `deleteTask` (lib/tasks/actions.ts) selecciona `storageKey` de `task_document` por `taskId` antes del DELETE
- [x] 7.2 `Promise.allSettled` de `deletePrivateAsset` por cada key; los `rejected` se loggean con `console.warn` incluyendo el `storageKey` afectado
- [x] 7.3 El DELETE de la tarea continúa independientemente del resultado del paso anterior; la FK cascade limpia `task_document`
- [x] 7.4 Si no hay documentos, no se invoca nada de R2 (la rama se saltea por `docRows.length === 0`)

## 8. UI: tab y panel de documentos

- [x] 8.1 `TabsTrigger value="documents"` agregado a `TaskDetailPane` con contador `(N)` cuando `documents.length > 0`
- [x] 8.2 `TabsContent value="documents"` renderiza `TaskDocumentsPanel` con `{ documents, canUploadDocument, taskId }`
- [x] 8.3 Componente `TaskDocumentsPanel` creado en `components/tasks/task-documents-panel.tsx` con botón "Adjuntar documento" (oculto si `!canUploadDocument`), input file oculto con `accept` por extensiones, lista ordenada con icono por tipo, nombre, tamaño, autor y tiempo relativo, y estado vacío con texto exacto requerido por la spec
- [x] 8.4 Handler "Descargar" llama `getTaskDocumentDownloadUrl` y al éxito navega a la URL firmada con `window.location.assign`
- [x] 8.5 Handler "Eliminar" pide confirmación con `window.confirm`, llama `deleteTaskDocument` y refresca
- [x] 8.6 `formatFileSize` y `IconForFile` (mapa Phosphor por extensión) implementados como helpers locales
- [x] 8.7 Inspección manual de copy: usa formas neutras con `tú` ("Adjuntar documento", "Descargar", "Eliminar", "Aún no hay documentos adjuntos.", "¿Eliminar este documento? Esta acción no se puede deshacer."); no hay voseo
- [x] 8.8 `uploaderLabel(doc)` devuelve `"Usuario eliminado"` cuando `uploaderId` es `null`, dejando Descargar funcional

## 9. Validación y verificación manual

- [x] 9.1 Aplicar la migración Drizzle en local y confirmar la estructura de `task_document` *(manual)*
- [x] 9.2 Probar upload de cada extensión válida (pdf, doc, docx, xls, xlsx, ppt, pptx, zip) y confirmar que el archivo aparece en R2 con el prefijo esperado y la fila persiste con metadatos correctos *(manual)*
- [x] 9.3 Probar upload con extensión inválida (`.exe`) y con archivo de 26 MB: ambas rechazadas con mensaje claro *(manual)*
- [x] 9.4 Probar descarga de un documento: verificar que el navegador recibe el archivo con el `fileName` humano original (no UUID) *(manual)*
- [x] 9.5 Probar eliminación en las tres ramas de autorización (autor de tarea, admin, uploader propio) y confirmar que el objeto desaparece de R2 y la fila desaparece de DB *(manual)*
- [x] 9.6 Probar `deleteTask` sobre una tarea draft con documentos: confirmar que la tarea desaparece, las filas `task_document` desaparecen por cascada y los blobs son removidos de R2 *(manual)*
- [x] 9.7 Probar permisos: un member fuera del equipo NO sube ni descarga; un member responsable NO borra documentos de otros; un admin sí *(manual)*
- [x] 9.8 Inspeccionar el copy del panel para confirmar español neutral y ausencia de voseo

## 10. Ejecutar `openspec validate`

- [x] 10.1 Ejecutar `openspec validate add-tasks-documents` y resolver cualquier error reportado antes de proceder
