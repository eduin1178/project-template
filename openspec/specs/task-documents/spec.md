# task-documents Specification

## Purpose

Adjuntar, descargar y eliminar documentos sobre una tarea. Define el modelo `TaskDocument`, la lista cerrada de tipos permitidos (pdf, doc/docx, xls/xlsx, ppt/pptx, zip) validados por MIME + extensión coherentes, el tamaño máximo (25 MB), la autorización para subir/descargar/eliminar (alineada con la regla de visibilidad de `task-assignments`), la convención de `storageKey` contra el bucket privado R2, las descargas vía URL firmada GET con TTL corto y `Content-Disposition` que preserva el nombre humano, la capability `canUploadDocument` extendida en `TaskCapabilities`, el campo `canDelete` proyectado por fila al cliente, y la UI con tab "Documentos" en `TaskDetailPane` y panel `TaskDocumentsPanel` con upload, listado, descarga y eliminación condicional. v1 sin paginación.

## Requirements

### Requirement: Modelo `TaskDocument`

El sistema SHALL exponer una entidad `TaskDocument` persistida en Postgres en una tabla `task_document` con los siguientes atributos: `id` (texto, PK), `taskId` (texto, FK a `task.id`, `ON DELETE CASCADE`, requerido), `uploaderId` (texto, FK a `user.id`, `ON DELETE SET NULL`, nullable), `fileName` (texto, requerido, nombre original del archivo subido), `mimeType` (texto, requerido), `sizeBytes` (entero, requerido, tamaño del objeto en bytes), `storageKey` (texto, requerido, UNIQUE, ruta del objeto en R2), `createdAt` (timestamp con zona, asignado automáticamente). La tabla SHALL tener un índice sobre `(taskId, createdAt)` para soportar listados por tarea ordenados cronológicamente.

#### Scenario: Inserción asigna createdAt y conserva nombre original

- **WHEN** se inserta un `task_document` sin proveer `createdAt` con `fileName = "Contrato V2.pdf"`
- **THEN** `createdAt` se asigna al instante actual y `fileName` se persiste literalmente como `"Contrato V2.pdf"`

#### Scenario: Documento se borra en cascada al borrar la tarea

- **WHEN** se elimina una tarea (vía `deleteTask`)
- **THEN** todas las filas de `task_document` con ese `taskId` se eliminan automáticamente por la FK CASCADE

#### Scenario: uploaderId queda null al borrar el usuario

- **WHEN** se elimina un `user` referenciado como `uploaderId` de un documento existente
- **THEN** la fila del documento permanece y `uploaderId` queda en `NULL`

#### Scenario: storageKey es único

- **WHEN** se intenta insertar dos filas con el mismo `storageKey`
- **THEN** la base de datos rechaza la segunda inserción por la constraint UNIQUE

### Requirement: Tipos de archivo permitidos

El sistema SHALL aceptar exclusivamente los siguientes tipos de archivo, identificados por la combinación de extensión declarada y MIME declarado:

- `pdf` → `application/pdf`
- `doc` → `application/msword`
- `docx` → `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `xls` → `application/vnd.ms-excel`
- `xlsx` → `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `ppt` → `application/vnd.ms-powerpoint`
- `pptx` → `application/vnd.openxmlformats-officedocument.presentationml.presentation`
- `zip` → `application/zip` o `application/x-zip-compressed`

La validación SHALL ejecutarse server-side en la server action `uploadTaskDocument` antes de subir nada a R2. La server action SHALL extraer la extensión del `fileName` recibido y SHALL verificar que la combinación `(extensión, MIME)` exista en la tabla canónica. Una sola discrepancia (extensión no listada, MIME no listado para esa extensión, o sin extensión) SHALL rechazar el upload.

#### Scenario: PDF válido

- **WHEN** se invoca `uploadTaskDocument` con `fileName = "informe.pdf"` y `mimeType = "application/pdf"`
- **THEN** la validación pasa y el upload procede

#### Scenario: Extensión no listada rechazada

- **WHEN** se invoca `uploadTaskDocument` con `fileName = "script.exe"` y cualquier `mimeType`
- **THEN** la acción falla con error de validación antes de tocar R2

#### Scenario: MIME no coincide con extensión

- **WHEN** se invoca `uploadTaskDocument` con `fileName = "doc.pdf"` y `mimeType = "image/png"`
- **THEN** la acción falla con error de validación antes de tocar R2

#### Scenario: ZIP con MIME alternativo aceptado

- **WHEN** se invoca `uploadTaskDocument` con `fileName = "archivos.zip"` y `mimeType = "application/x-zip-compressed"`
- **THEN** la validación pasa (MIME alternativo válido para extensión `zip`)

#### Scenario: Archivo sin extensión rechazado

- **WHEN** se invoca `uploadTaskDocument` con `fileName = "anexo"` (sin punto ni extensión) y cualquier `mimeType`
- **THEN** la acción falla con error de validación

### Requirement: Tamaño máximo por archivo

El sistema SHALL rechazar uploads cuyo `sizeBytes` exceda 25 MB (26,214,400 bytes). La validación SHALL ocurrir en la server action `uploadTaskDocument` antes de subir el objeto a R2.

#### Scenario: Archivo de 24 MB aceptado

- **WHEN** se invoca `uploadTaskDocument` con un archivo de 24 MB y tipo válido
- **THEN** el upload procede

#### Scenario: Archivo de 26 MB rechazado

- **WHEN** se invoca `uploadTaskDocument` con un archivo de 26 MB y tipo válido
- **THEN** la acción falla con error de validación indicando que el archivo excede el límite, antes de tocar R2

### Requirement: Autorización para subir

El sistema SHALL permitir invocar `uploadTaskDocument` sobre una tarea si y solo si el invocador cumple la regla de visibilidad de la tarea definida en `task-assignments`. Es decir: `admin`/`owner` de la organización de la tarea pueden subir siempre (incluso en `draft` y `archived`); el `member` puede subir si la tarea tiene `visibility = 'active'` Y es `authorId`, `responsibleId` o existe en `task_assignee`. Usuarios sin organización activa o fuera de la organización de la tarea SHALL recibir error de autorización.

#### Scenario: Admin sube documento en draft

- **WHEN** un admin invoca `uploadTaskDocument` sobre una tarea de su organización con `visibility = "draft"`
- **THEN** el documento se persiste y queda registrado en R2

#### Scenario: Responsable member sube documento en active

- **WHEN** un `member` con `responsibleId = me` invoca `uploadTaskDocument` sobre esa tarea con `visibility = "active"`
- **THEN** el documento se persiste

#### Scenario: Assignee member sube documento en active

- **WHEN** un `member` presente en `task_assignee` invoca `uploadTaskDocument` sobre esa tarea con `visibility = "active"`
- **THEN** el documento se persiste

#### Scenario: Member NO sube documento en draft donde participa

- **WHEN** un `member` que es responsable o assignee invoca `uploadTaskDocument` sobre una tarea con `visibility = "draft"`
- **THEN** la operación falla con error de autorización

#### Scenario: Member NO sube documento donde no participa

- **WHEN** un `member` que NO es autor, responsable ni assignee invoca `uploadTaskDocument` sobre una tarea active de su org
- **THEN** la operación falla con error de autorización

#### Scenario: Usuario fuera de la org NO sube

- **WHEN** un usuario sin membresía en la organización de la tarea invoca `uploadTaskDocument`
- **THEN** la operación falla con error de autorización

### Requirement: Convención de `storageKey`

El sistema SHALL componer el `storageKey` de cada documento como `task-documents/{orgId}/{taskId}/{uuid}.{ext}`, donde `{uuid}` es un UUID v4 generado server-side al momento de subir, y `{ext}` es la extensión normalizada en minúsculas extraída del `fileName` validado. El `storageKey` SHALL persistirse en la columna del mismo nombre y SHALL coincidir con el `Key` usado al ejecutar `PutObjectCommand` en R2.

#### Scenario: storageKey con prefijo correcto

- **WHEN** un upload exitoso ocurre sobre una tarea con `organizationId = "org-1"` y `id = "task-42"` para un archivo `.pdf`
- **THEN** `storageKey` queda con la forma `task-documents/org-1/task-42/{uuid}.pdf`

#### Scenario: storageKey único entre uploads

- **WHEN** dos uploads del mismo archivo `informe.pdf` ocurren sobre la misma tarea
- **THEN** se generan dos filas con `storageKey` distintos (UUIDs distintos)

### Requirement: Descarga vía presigned GET URL

El sistema SHALL exponer una server action `getTaskDocumentDownloadUrl(documentId)` que (1) valida que el documento existe y pertenece a una tarea de la organización del invocador, (2) valida que el invocador cumple la misma regla de autorización definida para subir, y (3) genera y retorna una URL prefirmada GET contra el bucket privado con `expiresIn: 300` (5 minutos) e incluye `ResponseContentDisposition` con `attachment; filename="{fileName sanitizado}"` y `filename*=UTF-8''{percent-encoded fileName}` para preservar el nombre humano original al descargar. La identidad del invocador NO SHALL viajar en la URL; la URL firmada SHALL ser auto-contenida y temporal.

#### Scenario: Descarga exitosa retorna URL firmada

- **WHEN** un invocador autorizado invoca `getTaskDocumentDownloadUrl` sobre un documento de una tarea visible para él
- **THEN** la action retorna `{ ok: true, url }` donde `url` es una URL firmada al endpoint R2 con vencimiento aproximado de 5 minutos

#### Scenario: Header de descarga preserva nombre original

- **WHEN** un cliente abre la URL retornada para un documento con `fileName = "Informe Final.pdf"`
- **THEN** el navegador descarga el archivo con el nombre `Informe Final.pdf` (no con el UUID del `storageKey`)

#### Scenario: Member sin participación NO obtiene URL

- **WHEN** un `member` que NO es autor, responsable ni assignee invoca `getTaskDocumentDownloadUrl` sobre un documento de una tarea active de su org
- **THEN** la operación falla con error de autorización y NO se firma URL alguna

#### Scenario: Documento de otra org rechazado

- **WHEN** un usuario invoca `getTaskDocumentDownloadUrl` sobre un documento cuya tarea pertenece a otra organización
- **THEN** la operación falla con error de autorización

#### Scenario: Documento inexistente

- **WHEN** un invocador autorizado invoca `getTaskDocumentDownloadUrl` con un `documentId` que no existe
- **THEN** la acción retorna error con mensaje claro de "documento no encontrado"

### Requirement: Eliminación de documento

El sistema SHALL exponer una server action `deleteTaskDocument(documentId)` que ejecuta hard-delete: primero elimina el objeto en R2 con `deletePrivateAsset` y luego elimina la fila en `task_document`. Si la eliminación en R2 falla, la acción SHALL fallar sin modificar DB. Si la eliminación en R2 tiene éxito pero el DELETE en DB falla, la acción SHALL loggear un warning y propagar el error. La acción SHALL ser idempotente solo respecto a un `documentId` que ya no existe (retorna error claro de "no encontrado", no error de autorización confuso).

La acción SHALL permitir la eliminación si y solo si:
- El invocador es `admin` u `owner` de la organización de la tarea, O
- El invocador es el `authorId` de la tarea (cualquier documento), O
- El invocador es el `uploaderId` del documento.

#### Scenario: Autor de la tarea borra documento de otro

- **WHEN** el `authorId` de una tarea invoca `deleteTaskDocument` sobre un documento subido por un assignee
- **THEN** el objeto se elimina de R2 y la fila se elimina de DB

#### Scenario: Admin borra documento ajeno

- **WHEN** un admin u owner de la organización invoca `deleteTaskDocument` sobre cualquier documento de una tarea de esa org
- **THEN** el objeto se elimina de R2 y la fila se elimina de DB

#### Scenario: Uploader borra su propio documento

- **WHEN** el `uploaderId` (member regular, no autor de la tarea, no admin) invoca `deleteTaskDocument` sobre un documento que él subió
- **THEN** la eliminación procede

#### Scenario: Member NO autor NO uploader NO borra

- **WHEN** un member que es responsable o assignee de la tarea pero NO es el autor de la tarea ni el uploader del documento invoca `deleteTaskDocument`
- **THEN** la operación falla con error de autorización

#### Scenario: Fallo en R2 deja la fila intacta

- **WHEN** `deleteTaskDocument` ejecuta `deletePrivateAsset` y R2 retorna error
- **THEN** la fila en `task_document` permanece y la acción retorna error al usuario

#### Scenario: Documento inexistente retorna error

- **WHEN** un invocador autorizado invoca `deleteTaskDocument` con un `documentId` que no existe
- **THEN** la acción retorna `ok: false` con mensaje "documento no encontrado"

### Requirement: Capabilities `canUploadDocument` y `canDelete` proyectado

El sistema SHALL extender `TaskCapabilities` con un campo `canUploadDocument: boolean` calculado server-side por la misma regla que la autorización para subir (admin/owner siempre; member solo en `active` siendo autor, responsable o assignee). Adicionalmente, al cargar el detalle de una tarea, el sistema SHALL retornar la lista de documentos con un campo `canDelete: boolean` precalculado por fila, equivalente a: `viewer.role IN ('admin','owner') OR viewer.id === task.authorId OR viewer.id === document.uploaderId`. La identidad del viewer y el `uploaderId` SHALL viajar al cliente como datos del autor para mostrar "Subido por X"; el booleano `canDelete` resume la regla.

#### Scenario: Admin tiene canUploadDocument

- **WHEN** un admin abre el detalle de una tarea de su org (cualquier visibility)
- **THEN** las capabilities calculadas incluyen `canUploadDocument = true`

#### Scenario: Member responsable de tarea active tiene canUploadDocument

- **WHEN** un `member` responsable de una tarea con `visibility = "active"` abre su detalle
- **THEN** `canUploadDocument = true`

#### Scenario: Member responsable de tarea draft NO tiene canUploadDocument

- **WHEN** un `member` responsable de una tarea con `visibility = "draft"` abre su detalle
- **THEN** `canUploadDocument = false`

#### Scenario: canDelete true para admin sobre cualquier documento

- **WHEN** un admin u owner abre el detalle de una tarea con varios documentos subidos por distintos usuarios
- **THEN** todos los documentos viajan al cliente con `canDelete = true`

#### Scenario: canDelete true para autor de la tarea sobre documentos ajenos

- **WHEN** el `authorId` de la tarea (no admin) abre el detalle y la tarea tiene documentos subidos por un assignee
- **THEN** esos documentos viajan al cliente con `canDelete = true`

#### Scenario: canDelete true para uploader sobre su propio documento

- **WHEN** un member (no admin, no autor) que subió un documento abre el detalle de esa tarea
- **THEN** solo los documentos cuyo `uploaderId` coincida con el viewer viajan con `canDelete = true`; los demás con `canDelete = false`

### Requirement: Tab "Documentos" en `TaskDetailPane`

El sistema SHALL renderizar un tercer trigger `Documentos` en el `TabsList` de `TaskDetailPane`, junto a `Detalle` y `Comentarios`. El trigger SHALL mostrar un contador `(N)` cuando la tarea tenga uno o más documentos (mismo patrón que el contador de comentarios). El `TabsContent value="documents"` SHALL renderizar un panel `TaskDocumentsPanel` que recibe la lista de documentos con sus campos proyectados, el flag `canUploadDocument` y los identificadores necesarios para invocar las server actions.

#### Scenario: Tab Documentos visible para cualquier viewer del detail pane

- **WHEN** un viewer autorizado selecciona una tarea en el detail pane
- **THEN** el `TabsList` muestra tres triggers: `Detalle`, `Comentarios`, `Documentos`

#### Scenario: Contador refleja el total de documentos

- **WHEN** una tarea tiene tres documentos asociados
- **THEN** el trigger `Documentos` muestra `Documentos (3)`

#### Scenario: Contador oculto cuando no hay documentos

- **WHEN** una tarea no tiene documentos
- **THEN** el trigger `Documentos` muestra solo el texto `Documentos` sin contador

### Requirement: UI del panel `TaskDocumentsPanel`

El sistema SHALL renderizar dentro del `TabsContent value="documents"` un panel con los siguientes elementos: (a) un botón "Adjuntar documento" arriba que abre un selector de archivos del sistema operativo; el botón SHALL estar oculto si `canUploadDocument` es false. (b) Una lista de documentos ordenados por `createdAt DESC` (más reciente arriba). (c) Cada fila SHALL mostrar un icono coherente con la extensión, el `fileName`, el tamaño formateado (`X KB` o `X.Y MB`), la línea "Subido por {nombre del uploader o `Usuario eliminado`} hace {timestamp relativo}", un botón "Descargar" y un botón "Eliminar" condicional al campo `canDelete` proyectado. (d) Un estado vacío con el texto exacto `Aún no hay documentos adjuntos.` cuando no hay documentos. Todo el copy SHALL usar español neutral en segunda persona singular `tú`, sin voseo.

#### Scenario: Botón Adjuntar visible para invocador con canUploadDocument

- **WHEN** un viewer con `canUploadDocument = true` abre el tab `Documentos`
- **THEN** el botón "Adjuntar documento" aparece visible arriba de la lista

#### Scenario: Botón Adjuntar oculto sin canUploadDocument

- **WHEN** un viewer con `canUploadDocument = false` abre el tab `Documentos`
- **THEN** el botón "Adjuntar documento" NO aparece y el panel queda en modo solo-lectura

#### Scenario: Lista ordenada por createdAt DESC

- **WHEN** una tarea tiene tres documentos subidos en distintos momentos
- **THEN** la lista muestra primero el documento más reciente y al final el más antiguo

#### Scenario: Fila muestra metadatos completos

- **WHEN** un documento se renderiza con `fileName = "Informe.pdf"`, `sizeBytes = 1258291` (≈1.2 MB), `uploaderName = "Ana"` y `createdAt` hace dos horas
- **THEN** la fila muestra el icono PDF, `Informe.pdf`, `1.2 MB`, `Subido por Ana hace 2 h` y los botones Descargar y (condicional) Eliminar

#### Scenario: Botón Eliminar visible solo si canDelete

- **WHEN** un documento llega con `canDelete = true`
- **THEN** el botón "Eliminar" aparece en esa fila

#### Scenario: Botón Eliminar oculto si canDelete false

- **WHEN** un documento llega con `canDelete = false`
- **THEN** el botón "Eliminar" NO aparece en esa fila

#### Scenario: Estado vacío exacto

- **WHEN** una tarea no tiene documentos y el viewer abre el tab `Documentos`
- **THEN** se renderiza el texto exacto `Aún no hay documentos adjuntos.`

#### Scenario: Uploader eliminado

- **WHEN** un documento se renderiza con `uploaderId = NULL` (porque el usuario fue eliminado)
- **THEN** la línea muestra `Subido por Usuario eliminado hace {timestamp}` y el botón Descargar sigue disponible

#### Scenario: Descargar dispara la URL firmada

- **WHEN** el viewer hace click en "Descargar" sobre un documento
- **THEN** la UI invoca `getTaskDocumentDownloadUrl(documentId)` y, al recibir éxito, navega a la URL retornada para forzar la descarga con el nombre humano original

#### Scenario: Adjuntar archivo válido refresca la lista

- **WHEN** el viewer selecciona un archivo PDF válido y la action `uploadTaskDocument` retorna éxito
- **THEN** la lista se refresca y el nuevo documento aparece en la primera fila

#### Scenario: Adjuntar archivo inválido muestra error

- **WHEN** el viewer selecciona un archivo cuya extensión o MIME no está en la lista permitida
- **THEN** la UI muestra un mensaje de error claro en español neutral y NO se sube nada a R2

#### Scenario: Adjuntar archivo demasiado grande muestra error

- **WHEN** el viewer selecciona un archivo de tamaño superior a 25 MB
- **THEN** la UI muestra un mensaje de error indicando el tamaño máximo permitido y NO se sube

#### Scenario: Copy en español neutral

- **WHEN** se inspecciona el copy visible del panel (botones, labels, estado vacío, mensajes de error)
- **THEN** todas las cadenas usan formas neutras (`tú`, "Adjunta", "Descarga", "Elimina", "Aún no hay documentos adjuntos.") y NO contienen voseo

### Requirement: Sin paginación en v1

El sistema en v1 SHALL traer todos los documentos de una tarea en una sola consulta junto con el detalle, sin paginación. Cuando el volumen crezca al punto de afectar performance, una propuesta futura SHALL agregar paginación; este alcance queda fuera de esta capability.

#### Scenario: Todos los documentos viajan en una sola respuesta

- **WHEN** un viewer abre una tarea con N documentos (N razonable en v1)
- **THEN** los N documentos llegan en la misma respuesta del server component, sin scroll virtualizado ni "cargar más"
