## MODIFIED Requirements

### Requirement: Tab "Documentos" en `TaskDetailPane`
El sistema SHALL renderizar documentos adjuntos como una sección visible del detalle full-page de la tarea. Aunque el nombre histórico del requirement menciona el tab `Documentos`, la nueva presentación NO SHALL requerir un tab para acceder a documentos. La sección SHALL mostrar un título `Documentos adjuntos` o equivalente, un contador cuando existan documentos y el panel `TaskDocumentsPanel` con la lista y acciones permitidas.

La sección SHALL recibir la lista de documentos con sus campos proyectados, el flag `canUploadDocument` y los identificadores necesarios para invocar las server actions. En desktop, la sección SHALL ubicarse en la columna principal debajo del checklist; en mobile, SHALL mantener el mismo orden dentro del flujo vertical.

#### Scenario: Documentos visibles para cualquier viewer del detalle
- **WHEN** un viewer autorizado abre el detalle full-page de una tarea
- **THEN** la sección de documentos se muestra dentro del contenido principal cuando corresponda, sin exigir navegación por tabs

#### Scenario: Contador refleja el total de documentos
- **WHEN** una tarea tiene tres documentos asociados
- **THEN** la sección muestra un contador o etiqueta equivalente que comunica que hay 3 documentos

#### Scenario: Estado vacío cuando no hay documentos
- **WHEN** una tarea no tiene documentos
- **THEN** la sección o el panel muestra un estado vacío claro según las reglas de `TaskDocumentsPanel`

### Requirement: UI del panel `TaskDocumentsPanel`
El sistema SHALL renderizar dentro de la sección de documentos un panel con los siguientes elementos: (a) un botón `Adjuntar documento` arriba que abre un selector de archivos del sistema operativo; el botón SHALL estar oculto si `canUploadDocument` es false. (b) Una lista de documentos ordenados por `createdAt DESC` (más reciente arriba). (c) Cada fila SHALL mostrar icono coherente con la extensión, `fileName`, tamaño formateado (`X KB` o `X.Y MB`), línea `Subido por {nombre del uploader o Usuario eliminado} hace {timestamp relativo}`, botón `Descargar` y botón `Eliminar` condicional al campo `canDelete` proyectado. (d) Un estado vacío con el texto exacto `Aún no hay documentos adjuntos.` cuando no hay documentos. Todo el copy SHALL usar español neutral en segunda persona singular `tú`, sin voseo.

#### Scenario: Botón Adjuntar visible para invocador con canUploadDocument
- **WHEN** un viewer con `canUploadDocument = true` abre el detalle de la tarea
- **THEN** el botón `Adjuntar documento` aparece visible en la sección de documentos

#### Scenario: Botón Adjuntar oculto sin canUploadDocument
- **WHEN** un viewer con `canUploadDocument = false` abre el detalle de la tarea
- **THEN** el botón `Adjuntar documento` NO aparece y el panel queda en modo solo-lectura

#### Scenario: Lista ordenada por createdAt DESC
- **WHEN** una tarea tiene tres documentos subidos en distintos momentos
- **THEN** la lista muestra primero el documento más reciente y al final el más antiguo

#### Scenario: Fila muestra metadatos completos
- **WHEN** un documento se renderiza con `fileName = "Informe.pdf"`, `sizeBytes = 1258291`, `uploaderName = "Ana"` y `createdAt` hace dos horas
- **THEN** la fila muestra el icono PDF, `Informe.pdf`, `1.2 MB`, `Subido por Ana hace 2 h` y los botones Descargar y, condicionalmente, Eliminar

#### Scenario: Botón Eliminar visible solo si canDelete
- **WHEN** un documento llega con `canDelete = true`
- **THEN** el botón `Eliminar` aparece en esa fila

#### Scenario: Botón Eliminar oculto si canDelete false
- **WHEN** un documento llega con `canDelete = false`
- **THEN** el botón `Eliminar` NO aparece en esa fila

#### Scenario: Estado vacío exacto
- **WHEN** una tarea no tiene documentos y el viewer abre el detalle
- **THEN** se renderiza el texto exacto `Aún no hay documentos adjuntos.`

#### Scenario: Uploader eliminado
- **WHEN** un documento se renderiza con `uploaderId = NULL`
- **THEN** la línea muestra `Subido por Usuario eliminado hace {timestamp}` y el botón Descargar sigue disponible

#### Scenario: Descargar dispara la URL firmada
- **WHEN** el viewer hace click en `Descargar` sobre un documento
- **THEN** la UI invoca `getTaskDocumentDownloadUrl(documentId)` y, al recibir éxito, navega a la URL retornada para forzar la descarga con el nombre humano original

#### Scenario: Adjuntar archivo válido refresca la lista
- **WHEN** el viewer selecciona un archivo PDF válido y `uploadTaskDocument` retorna éxito
- **THEN** la lista se refresca y el nuevo documento aparece en la primera fila

#### Scenario: Adjuntar archivo inválido muestra error
- **WHEN** el viewer selecciona un archivo cuya extensión o MIME no está en la lista permitida
- **THEN** la UI muestra un mensaje de error claro en español neutral y NO se sube nada a R2

#### Scenario: Adjuntar archivo demasiado grande muestra error
- **WHEN** el viewer selecciona un archivo de tamaño superior a 25 MB
- **THEN** la UI muestra un mensaje de error indicando el tamaño máximo permitido y NO se sube

#### Scenario: Copy en español neutral
- **WHEN** se inspecciona el copy visible del panel
- **THEN** todas las cadenas usan formas neutras (`tú`, `Adjunta`, `Descarga`, `Elimina`, `Aún no hay documentos adjuntos.`) y NO contienen voseo
