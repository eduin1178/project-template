## MODIFIED Requirements

### Requirement: Transición de `status`

El sistema SHALL exponer una server action `changeTaskStatus(taskId, newStatus, commentBody?)` que es la ÚNICA vía para mutar `task.status`. La action SHALL ejecutarse dentro de una transacción de base de datos atómica y SHALL realizar, en este orden, dentro de la misma transacción:

1. Validar autorización del invocador (definida en `task-assignments` para el detalle de qué viewer puede invocar y bajo qué condiciones de vencimiento).
2. Validar que `newStatus` es alcanzable desde el `status` actual. La regla SHALL permitir libremente cualquier par de transiciones EXCEPTO la transición directa `pending → done`.
3. Si se recibe `commentBody` y, tras `trim`, no queda vacío, SHALL validar que tenga a lo sumo 2000 caracteres e insertar una fila en `task_comment` con `authorId = invocador.id`, `taskId = taskId`, `body = commentBody.trim()` y `createdAt = NOW()`. Si `commentBody` está ausente o queda vacío tras `trim`, NO SHALL insertar comentario.
4. Actualizar `task.status = newStatus` y refrescar `task.updatedAt`.

Si CUALQUIER paso falla, la transacción SHALL hacer rollback completo: ni el comentario (cuando aplique) ni el cambio de `status` SHALL persistirse. La base de datos SHALL aplicar un CHECK constraint sobre los valores permitidos del enum de `status` sin codificar la regla de transición; esa regla vive en la action.

El `commentBody` SHALL ser opcional para todos los roles. La justificación textual es un mecanismo de trazabilidad DISPONIBLE pero NO obligatorio.

#### Scenario: Transición válida con comentario
- **WHEN** un usuario invoca `changeTaskStatus` con `taskId` de una tarea `pending`, `newStatus = "in_progress"` y `commentBody = "Arranco la revisión del contrato hoy"`
- **THEN** se inserta una fila en `task_comment` con ese body y `task.status` queda en `in_progress` en la misma transacción

#### Scenario: Transición válida sin comentario
- **WHEN** un usuario invoca `changeTaskStatus` con `newStatus = "in_progress"` y sin `commentBody`
- **THEN** `task.status` queda en `in_progress` y NO se inserta ninguna fila en `task_comment`

#### Scenario: Transición bloqueada pending → done
- **WHEN** un usuario invoca `changeTaskStatus` con `task.status = "pending"` y `newStatus = "done"`
- **THEN** la acción falla con error de validación; ni el comentario ni el status se persisten

#### Scenario: Comentario excede 2000 caracteres
- **WHEN** un usuario invoca `changeTaskStatus` con `commentBody` de 2001 caracteres post-trim
- **THEN** la acción falla con error de validación

#### Scenario: Rollback al fallar update de status
- **WHEN** el `UPDATE` sobre `task` falla durante una invocación válida con comentario tras insertar el comentario en la misma transacción
- **THEN** la transacción hace rollback y la fila de `task_comment` no queda persistida

### Requirement: Cambio de status desde drag-and-drop usa acción existente
El sistema SHALL tratar cualquier cambio de estado iniciado por drag-and-drop como una invocación de la server action existente `changeTaskStatus(taskId, newStatus)`. Ningún componente de UI, endpoint alternativo ni acción nueva SHALL mutar `task.status` directamente como resultado de un drop sin pasar por la action.

El drag-and-drop NO SHALL exigir comentario: invoca `changeTaskStatus` sin `commentBody`. La autorización, reglas de transición, bloqueo de `pending → done` y gate de vencimiento SHALL seguir rigiéndose por los requirements de `changeTaskStatus` y sus capabilities relacionadas.

#### Scenario: Drag-and-drop no crea vía alternativa de mutación
- **WHEN** una card se suelta sobre una columna de estado diferente y válida
- **THEN** la mutación real de `task.status` ocurre exclusivamente mediante `changeTaskStatus`

#### Scenario: Drag-and-drop no requiere comentario
- **WHEN** un usuario suelta una card en otra columna de estado válida
- **THEN** el estado cambia sin solicitar ni exigir un comentario justificativo

### Requirement: Presentación full-page del detalle de tarea
El sistema SHALL renderizar el detalle de una tarea como página dedicada con composición responsive. El detalle SHALL incluir: header con título, badges de `visibility` y `status`, vencimiento, responsable/equipo, descripción, checklist, documentos adjuntos y comentarios.

Las acciones permitidas según `TaskCapabilities` SHALL consolidarse en una sola fuente, alineadas a la derecha en la MISMA línea que muestra los metadatos (`visibility`, `status`, vencimiento). Las acciones primarias contextuales (transición de estado y, cuando aplique, la transición de visibilidad primaria) SHALL renderizarse como botones; el resto de acciones SHALL agruparse en un único menú de overflow. NO SHALL existir un segundo conjunto duplicado de las mismas acciones en el header.

Checklist y documentos SHALL presentarse como pestañas (tabs) ubicadas debajo del bloque de descripción en la columna principal, con el conteo en el label de cada tab. En desktop amplio, el contenido SHALL usar una composición de dos zonas: columna principal para descripción y las tabs de checklist/documentos; columna secundaria para comentarios. En tablet y mobile, todas las secciones SHALL fluir en una sola columna en orden lógico: header, metadatos y acciones, descripción, tabs (checklist/documentos) y comentarios.

#### Scenario: Acciones en la línea de metadatos
- **WHEN** un viewer con capability de cambiar estado abre el detalle
- **THEN** la acción de estado se muestra como botón alineado a la derecha en la línea de metadatos, no en una fila separada ni duplicada en el header

#### Scenario: Checklist y documentos como tabs
- **WHEN** un usuario abre el detalle de una tarea con checklist y documentos
- **THEN** ve un control de tabs bajo la descripción con `Checklist` y `Documentos`, cada uno con su conteo, y solo el contenido del tab activo

#### Scenario: Desktop muestra detalle con comentarios laterales
- **WHEN** un usuario abre `/tasks/<id>` o `/admin/tasks/<id>` en desktop amplio
- **THEN** el detalle muestra contenido principal a la izquierda y comentarios en una columna secundaria a la derecha

#### Scenario: Mobile muestra detalle en flujo vertical
- **WHEN** un usuario abre el detalle en mobile
- **THEN** metadatos con acciones, descripción, tabs de checklist/documentos y comentarios se muestran en una sola columna legible sin romper el layout

#### Scenario: Header conserva acciones por capabilities
- **WHEN** un viewer no tiene `canEditContent` ni `canEditDueAt`
- **THEN** el detalle no muestra el botón `Editar`, aunque el layout full-page esté activo
