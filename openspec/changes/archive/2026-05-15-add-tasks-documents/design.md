## Context

Las tareas hoy soportan texto (detalle + comentarios). Falta el canal para evidencia binaria (PDFs, planillas, presentaciones, ZIPs). El proyecto ya integra Cloudflare R2 vía `lib/storage/r2.ts` exclusivamente para logos de organización (bucket público). La capability `r2-storage` documenta esa integración y la convención de validar MIME/tamaño en el caller. `task-comments` estableció el patrón de proyectar `canDelete` por fila desde el server, server actions con `requireOrgMember`, soft-delete e índice `(taskId, createdAt)`. `TaskDetailPane` ya usa `Tabs` con dos triggers (`detail`, `comments`); agregar un tercer trigger es de bajo costo.

## Goals / Non-Goals

**Goals:**
- Permitir adjuntar/descargar/eliminar documentos a una tarea sin exponer URLs públicas a sus contenidos.
- Reusar el módulo `lib/storage/r2.ts` con extensiones mínimas y agnósticas al dominio.
- Mantener la coherencia con `task-comments`: server actions, capabilities precalculadas, copy neutral con `tú`.
- Hard-delete consistente (fila DB + objeto R2), sin dejar blobs huérfanos al borrar tareas.
- Validación cerrada de tipos (MIME + extensión coherentes) y tamaño máximo (25 MB) server-side.

**Non-Goals:**
- Versionado de documentos: cada upload es un registro independiente.
- Previsualización en línea (PDF viewer, Office preview).
- Magic-bytes / antivirus / escaneo de contenido. Confiamos en MIME declarado + extensión.
- Soft-delete con auditoría de quién borró: hard-delete deliberado para no acumular blobs.
- Comentarios sobre documentos, etiquetas o carpetas.
- Subida directa con presigned PUT (multipart, chunked). v1 sube vía server action.

## Decisions

### Storage privado en bucket aparte
Decisión: **dos buckets R2 en el mismo account**: el existente `R2_BUCKET` queda como público (logos), y un nuevo `R2_DOCUMENTS_BUCKET` privado para documentos de tareas. Las primitivas del módulo aceptan `bucket` como parámetro y permanecen agnósticas al dominio.

Alternativa descartada: un único bucket con políticas mixtas (carpetas privadas con `Cache-Control: private`). En R2 la frontera más simple es el bucket: el público tiene `R2_PUBLIC_BASE_URL` enlazado a un custom domain; el privado simplemente no lo tiene. Separar es menos error-prone que arbitrar policies dentro de un mismo bucket.

### Descargas vía presigned GET URL
Decisión: la server action `getTaskDocumentDownloadUrl` valida permisos, firma una URL GET con `@aws-sdk/s3-request-presigner`, `expiresIn: 300` segundos, e incluye `ResponseContentDisposition: attachment; filename="${sanitizado}"` para preservar el nombre humano original (el key es UUID).

Alternativa descartada: route handler streaming (`/api/tasks/[id]/documents/[docId]`). Pone el archivo a transitar por Next, duplica egress y empeora performance con archivos grandes. La presigned URL deja la transferencia entre cliente y R2, manteniendo el control de autorización server-side al momento de firmar.

Sanitización del `filename` en la header: reemplazar caracteres no ASCII y comillas para evitar romper la cabecera `Content-Disposition`. Usar comillas dobles + escape de `\"` y `\\`. Si el nombre original tuviera tildes/eñes, se aplica también `filename*=UTF-8''<percent-encoded>` para clientes modernos.

### Upload vía server action con `FormData`
Decisión: el cliente envía un `FormData` con el `File` a la server action `uploadTaskDocument`. La action: (1) valida permisos (`canUploadDocument` sobre la tarea), (2) lee el `name`, `type` y `size` del File, (3) valida MIME declarado + extensión coherente contra una tabla cerrada (constante exportada `ALLOWED_DOCUMENT_TYPES`), (4) valida `size <= 25 MB`, (5) compone el `storageKey = task-documents/{orgId}/{taskId}/{uuid}.{ext}`, (6) convierte el body a `Buffer` y llama `uploadPrivateAsset({ key, body, contentType, bucket: R2_DOCUMENTS_BUCKET })`, (7) inserta la fila `task_document`, (8) `revalidatePath` igual que `comment-actions`.

Configurar Next 16 `serverActions.bodySizeLimit: "30mb"` en `next.config.ts` para dejar margen sobre los 25 MB (multipart suma overhead).

Alternativa descartada: presigned PUT directo desde el cliente. Reduce egress server pero requiere una segunda action de "confirmar upload" y manejo de subidas fallidas/huérfanas. Para v1 con techo de 25 MB no compensa la complejidad.

### Validación MIME + extensión (lista cerrada)
Tabla canónica en `lib/tasks/documents.ts`:

```ts
const ALLOWED_DOCUMENT_TYPES = [
  { ext: "pdf",  mime: ["application/pdf"] },
  { ext: "doc",  mime: ["application/msword"] },
  { ext: "docx", mime: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"] },
  { ext: "xls",  mime: ["application/vnd.ms-excel"] },
  { ext: "xlsx", mime: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] },
  { ext: "ppt",  mime: ["application/vnd.ms-powerpoint"] },
  { ext: "pptx", mime: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"] },
  { ext: "zip",  mime: ["application/zip", "application/x-zip-compressed"] },
];
```

La validación server-side exige: extensión presente en la tabla Y el MIME declarado por el `File` aparezca en la lista de MIME válidos para esa extensión. Si el cliente miente sobre uno de los dos, falla. Magic-bytes queda fuera de v1.

### Eliminación: orden R2 → DB
Decisión: en `deleteTaskDocument`, primero ejecuta `deletePrivateAsset({ key })`. Si tiene éxito, ejecuta `DELETE FROM task_document WHERE id = ?`. Si R2 falla, propaga error al usuario sin tocar DB. Si la fila falla tras R2 OK, log de warning: queda una fila DB sin blob → el próximo `getTaskDocumentDownloadUrl` retorna error claro ("El archivo ya no está disponible").

Alternativa descartada: borrar DB primero. Si R2 falla, el blob queda huérfano sin referencia, imposible de limpiar después. El orden elegido prefiere el caso "fila apunta a nada" (recuperable: borrar la fila a mano) sobre "blob sin fila" (basura silenciosa).

### Cascada al borrar tarea
Decisión: en `deleteTask` (existe en `lib/tasks/actions.ts`), antes del `DELETE FROM task ...`, leer `task_document.storageKey` por `taskId`, ejecutar `Promise.allSettled` de `deletePrivateAsset` por cada key, loggear los fallos, y proceder con el DELETE. La cascada `ON DELETE CASCADE` de la FK limpia las filas `task_document` automáticamente.

Si un blob falla al borrarse → log de warning, no bloqueamos el delete de la tarea (el operador ya pidió borrar; un blob huérfano no es razón para frustrar la operación). Aceptamos huérfanos potenciales en R2 como costo bajo dado el volumen esperado y la posibilidad de un script de limpieza futuro.

### `canDelete` precalculado por fila
Patrón idéntico a `task-comments`. La query del detalle (o un loader específico de documents en el server component) calcula por cada documento:

```
canDelete = isAdmin
         || viewer.id === task.authorId
         || viewer.id === document.uploaderId
```

y proyecta `canDelete: boolean` al cliente. El `viewer.id` y `uploaderId` no viajan al cliente (solo el booleano).

### Capabilities: `canUploadDocument`
Suma a `TaskCapabilities`. La regla replica la visibilidad de `task-comments`: admin/owner siempre (cualquier visibility); member solo si la tarea está `active` Y es autor/responsable/assignee. Se calcula en el server component que precarga el detalle, igual que `canComment` (que ya existe en código aunque no esté declarado como tipo explícito en `capabilities.ts`).

### Tab "Documentos" en `TaskDetailPane`
El `TabsList` existente con `detail` y `comments` se extiende con un tercer trigger `documents`. El trigger muestra `Documentos` y el contador `(N)` cuando hay docs (mismo patrón del trigger de comments). El `TabsContent value="documents"` renderiza un nuevo componente `TaskDocumentsPanel` que recibe `{ documents, canUploadDocument, taskId, orgId }`.

`TaskDocumentsPanel` (client):
- Botón "Adjuntar documento" arriba (oculto si `!canUploadDocument`). Abre un `<input type="file">` programáticamente. Al seleccionar archivo, construye FormData y llama la action. Estado pending con spinner básico; al éxito refresca vía revalidate.
- Validación client-side espejada (extensión y `size`) para feedback inmediato — la server action es la fuente de verdad.
- Lista: cada fila con icono según extensión (Phosphor), `fileName`, badge de tamaño (`1.2 MB`), línea "Subido por {nombre} hace {relative}", botón "Descargar" y botón "Eliminar" condicional.
- "Descargar" llama una server action que retorna `{ url }` presigned, y el cliente navega a la URL con `window.location.assign(url)` o crea un `<a download>`.
- Estado vacío: copy "Aún no hay documentos adjuntos." centrado.
- Copy en español neutral con `tú`.

## Risks / Trade-offs

[MIME spoofing] → Aceptamos el riesgo en v1. Un cliente puede declarar `application/pdf` en un binario que no es PDF. La validación de MIME + extensión coherente reduce el ataque trivial, pero no inspecciona bytes. Mitigación futura: agregar validación con magic-bytes (`file-type` npm) en una propuesta posterior.

[Blob huérfano por fallo de R2 tras commit DB] → No aplica con el orden elegido (R2 → DB). El caso inverso ("fila sin blob") sí puede pasar: aceptable porque es detectable y recuperable.

[Blobs huérfanos por cascada de tarea] → Aceptamos. Tasa esperada baja. Mitigación opcional futura: job nocturno que liste objetos en R2 cuyo prefijo `task-documents/{orgId}/{taskId}/` no exista en DB.

[Egress al servidor en upload] → Hasta 25 MB por archivo viaja por Next. Próximo cuello si crece el volumen. Mitigación futura: presigned PUT con confirmación.

[Body size en Next 16] → Si no ajustamos `serverActions.bodySizeLimit`, uploads > 1MB fallan por default. Mitigación: configurar a `30mb` explícito y verificar en deploy.

[Pérdida de `uploaderId` por baja de usuario] → Con `ON DELETE SET NULL`, la línea queda como "Subido por (usuario eliminado)". UI debe contemplar `uploader = null` con un placeholder neutral.

[Filename con caracteres especiales] → `Content-Disposition` puede romperse. Mitigación: sanitizar comillas y backslashes; usar `filename*=UTF-8''<percent>` para Unicode.

[Tamaño del trigger del Tab cuando N crece] → Si una tarea tiene cientos de docs, "Documentos (350)" hace ruido. Aceptable por ahora; en una propuesta futura puede truncarse o llevarse a "Documentos (99+)".

## Migration Plan

1. Crear bucket privado en R2 (Cloudflare dashboard, acceso público deshabilitado) y configurar `R2_DOCUMENTS_BUCKET` en variables de entorno de cada ambiente.
2. Documentar la variable en `.env.example`.
3. Instalar `@aws-sdk/s3-request-presigner`.
4. Aplicar migración Drizzle que crea `task_document` con FKs y el índice.
5. Desplegar código: módulo R2 extendido, server actions, panel UI.
6. Verificar manual: upload, download (presigned), delete propio, delete admin, delete cascada de tarea draft, validación de MIME/tamaño rechazados.

Rollback: si algo falla en producción, basta con ocultar el trigger "Documentos" del Tab (feature flag suave) sin tocar DB. La tabla `task_document` puede convivir vacía. Para rollback duro: drop tabla + remover variable env.

## Open Questions

- ¿Hace falta paginar la lista de documentos por tarea en v1? Análogo a `task-comments`: NO en v1; documentamos como posible follow-up si una tarea acumula > 100 docs.
- ¿Mostrar tamaño total agregado en el trigger ("Documentos (3, 4.2 MB)")? Decisión: NO en v1; el contador simple basta.
