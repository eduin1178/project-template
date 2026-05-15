## MODIFIED Requirements

### Requirement: Transición de `status`

El sistema SHALL exponer una server action `changeTaskStatus(taskId, newStatus, commentBody)` que es la ÚNICA vía para mutar `task.status`. La action SHALL ejecutarse dentro de una transacción de base de datos atómica y SHALL realizar, en este orden, dentro de la misma transacción:

1. Validar autorización del invocador (definida en `task-assignments` para el detalle de qué viewer puede invocar y bajo qué condiciones de vencimiento).
2. Validar que `newStatus` es alcanzable desde el `status` actual. La regla SHALL permitir libremente cualquier par de transiciones EXCEPTO la transición directa `pending → done`.
3. Validar que `commentBody`, tras `trim`, tenga al menos 30 caracteres y a lo sumo 2000.
4. Insertar una fila en `task_comment` con `authorId = invocador.id`, `taskId = taskId`, `body = commentBody.trim()` y `createdAt = NOW()`.
5. Actualizar `task.status = newStatus` y refrescar `task.updatedAt`.

Si CUALQUIER paso falla, la transacción SHALL hacer rollback completo: ni el comentario ni el cambio de `status` SHALL persistirse. La base de datos SHALL aplicar un CHECK constraint sobre los valores permitidos del enum de `status` sin codificar la regla de transición ni la de comentario; ambas viven en la action.

La acción NO SHALL aceptar formas de cambiar `status` sin `commentBody`, ni siquiera para `admin` u `owner`: la justificación textual es un requisito universal de trazabilidad.

#### Scenario: Transición válida con comentario válido
- **WHEN** un admin invoca `changeTaskStatus` con `taskId` de una tarea `pending`, `newStatus = "in_progress"` y `commentBody = "Arranco la revisión del contrato hoy"` (más de 30 chars)
- **THEN** se inserta una fila en `task_comment` con ese body y `task.status` queda en `in_progress` en la misma transacción

#### Scenario: Transición bloqueada pending → done
- **WHEN** un admin invoca `changeTaskStatus` con `task.status = "pending"`, `newStatus = "done"` y `commentBody` válido
- **THEN** la acción falla con error de validación; ni el comentario ni el status se persisten

#### Scenario: Comentario menor a 30 caracteres
- **WHEN** un admin invoca `changeTaskStatus` con `commentBody = "ok"` (post-trim 2 chars)
- **THEN** la acción falla con error de validación indicando el mínimo de 30 caracteres; ni el comentario ni el status se persisten

#### Scenario: Comentario con solo espacios
- **WHEN** un admin invoca `changeTaskStatus` con `commentBody` que post-trim queda vacío
- **THEN** la acción falla con error de validación

#### Scenario: Comentario excede 2000 caracteres
- **WHEN** un admin invoca `changeTaskStatus` con `commentBody` de 2001 caracteres post-trim
- **THEN** la acción falla con error de validación

#### Scenario: Rollback al fallar inserción de comentario
- **WHEN** la inserción de `task_comment` falla por error de base (por ejemplo, constraint inesperada) durante una invocación válida
- **THEN** la transacción hace rollback y `task.status` permanece inalterado

#### Scenario: Rollback al fallar update de status
- **WHEN** el `UPDATE` sobre `task` falla durante una invocación válida tras insertar el comentario en la misma transacción
- **THEN** la transacción hace rollback y la fila de `task_comment` no queda persistida

#### Scenario: Admin debe proveer comentario
- **WHEN** un admin invoca `changeTaskStatus` sin `commentBody` o con `commentBody = null`
- **THEN** la acción falla con error de validación; el rol admin NO exime del requisito de justificación

## ADDED Requirements

### Requirement: Default de `dueAt` en `CreateTaskDialog`

El sistema SHALL precargar el campo `dueAt` del diálogo de creación de tareas (`CreateTaskDialog`) con un valor por defecto computado server-side igual a `NOW() del servidor + 7 días` con las horas, minutos, segundos y milisegundos fijados a `18:00:00.000` en la zona horaria del servidor. El valor SHALL pasarse al componente cliente como prop `defaultDueAt` (ISO 8601 string).

El usuario SHALL poder modificar o limpiar el campo antes de enviar el formulario. Si el usuario envía el formulario con `dueAt` vacío, la server action de creación SHALL aceptar `dueAt = NULL` cuando la tarea se crea en `draft` (regla existente intacta).

El diálogo de edición (`EditTaskDialog`) NO SHALL aplicar este default: SHALL mostrar el valor actual de `dueAt` de la tarea, o vacío si la tarea tiene `dueAt = NULL`.

#### Scenario: Apertura de CreateTaskDialog precarga dueAt
- **WHEN** un admin abre `CreateTaskDialog` en `/admin/tasks`
- **THEN** el campo `dueAt` se renderiza con el valor `NOW() del servidor + 7 días @ 18:00 TZ servidor`

#### Scenario: Usuario sobrescribe el default
- **WHEN** un admin abre `CreateTaskDialog`, modifica `dueAt` a una fecha distinta y envía
- **THEN** se persiste el valor modificado, no el default

#### Scenario: Usuario limpia el default en draft
- **WHEN** un admin abre `CreateTaskDialog`, limpia `dueAt` y envía con `visibility = "draft"`
- **THEN** la tarea se persiste con `dueAt = NULL`

#### Scenario: EditTaskDialog no aplica default
- **WHEN** un admin abre `EditTaskDialog` sobre una tarea con `dueAt = NULL`
- **THEN** el campo `dueAt` se renderiza vacío (sin precarga de default)

#### Scenario: EditTaskDialog muestra valor actual
- **WHEN** un admin abre `EditTaskDialog` sobre una tarea con un `dueAt` definido
- **THEN** el campo se renderiza con ese valor exacto
