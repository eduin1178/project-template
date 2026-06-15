# tasks-core Specification

## Purpose

Modelo de tarea por organización y CRUD básico. Cubre creación, edición de contenido bajo dos puertas (autor en `draft` o admin/owner), transiciones de `visibility` y `status` con reglas de dominio, listado filtrable accesible a admin/owner, borrado físico en `draft`, y acción "Tomar posesión" para reasignar `authorId`. Las relaciones de responsable y equipo de apoyo, así como las reglas de visibilidad por rol que abren lectura a members, viven en el capability `task-assignments`.

## Requirements

### Requirement: Modelo `Task` por organización

El sistema SHALL exponer una entidad `Task` persistida en Postgres con los siguientes atributos: `id` (identificador único, texto), `title` (texto, requerido), `description` (texto, opcional), `dueAt` (timestamp con zona, opcional en `draft`, requerido al transicionar a `active`), `visibility` (enum: `draft` | `active` | `archived`, default `draft`), `status` (enum: `pending` | `in_progress` | `done`, default `pending`), `authorId` (referencia a `user.id`, requerido), `responsibleId` (referencia a `user.id`, opcional, `ON DELETE SET NULL`), `organizationId` (referencia a `organization.id`, requerido), `createdAt` y `updatedAt` (timestamps). Cada `Task` SHALL pertenecer a exactamente UNA `organization` y NUNCA SHALL ser visible ni accesible desde otra organización.

#### Scenario: Crear tarea con defaults
- **WHEN** un admin crea una tarea sin especificar `visibility`, `status` ni `responsibleId`
- **THEN** se persiste con `visibility = "draft"`, `status = "pending"` y `responsibleId = NULL`

#### Scenario: Tarea aislada por organización
- **WHEN** un admin de la organización A consulta tareas estando en sesión con `activeOrganizationId = A`
- **THEN** el listado NO incluye tareas cuyo `organizationId` sea distinto de A

#### Scenario: Persistencia de timestamps
- **WHEN** se inserta una nueva tarea
- **THEN** `createdAt` y `updatedAt` se asignan automáticamente al instante actual

#### Scenario: Update de timestamps
- **WHEN** se modifica cualquier atributo de una tarea existente
- **THEN** `updatedAt` se refresca al instante de la modificación y `createdAt` permanece inalterado

#### Scenario: Responsable nulo al crear
- **WHEN** un admin crea una tarea en `draft` sin proveer `responsibleId`
- **THEN** la tarea se persiste con `responsibleId = NULL`

#### Scenario: Borrado de usuario referenciado como responsable
- **WHEN** se elimina el `user` apuntado por `responsibleId` de una tarea
- **THEN** el `responsibleId` de esa tarea queda en `NULL` y el resto de la tarea permanece intacto

### Requirement: Autorización por rol de organización

El sistema SHALL permitir crear, transicionar `visibility`, transicionar `status` y reasignar `authorId` SÓLO a usuarios cuya `member.role` en la `activeOrganizationId` sea `admin` o `owner`. Las acciones de edición de contenido, gestión de equipo y borrado tienen reglas adicionales que se definen en sus propios requirements. Usuarios sin membresía en la organización SHALL recibir un error de autorización (HTTP 403 equivalente en server actions) y la operación NO SHALL persistirse. La autorización de LECTURA ya no es exclusiva de admin/owner; se define en el capability `task-assignments`.

#### Scenario: Admin puede crear tarea
- **WHEN** un usuario con `member.role = "admin"` en la org activa invoca la acción de crear tarea
- **THEN** la tarea se persiste con `authorId` igual al `user.id` del invocador y `organizationId` igual a la org activa

#### Scenario: Owner puede crear tarea
- **WHEN** un usuario con `member.role = "owner"` en la org activa invoca la acción de crear tarea
- **THEN** la tarea se persiste y la operación es indistinguible del caso admin

#### Scenario: Member regular no puede crear tarea
- **WHEN** un usuario con `member.role = "member"` (o sin membresía) en la org activa invoca la acción de crear tarea
- **THEN** la operación falla con error de autorización y nada se persiste

#### Scenario: Usuario sin organización activa
- **WHEN** un usuario autenticado sin `activeOrganizationId` invoca cualquier acción de tareas
- **THEN** la operación falla con error de autorización

### Requirement: Edición de contenido

El sistema SHALL permitir editar `title` y `description` de una tarea bajo CUALQUIERA de estas dos condiciones (es OR, no AND):
1. El invocador es el `authorId` de la tarea Y la tarea tiene `visibility = 'draft'`, o
2. El invocador es `admin` u `owner` de la organización de la tarea (independiente de la visibility).

El sistema SHALL permitir editar `dueAt` SÓLO al `admin`/`owner` de la organización, y SÓLO si la tarea NO está en `visibility = 'archived'`. La edición NO SHALL alterar `visibility`, `status`, `authorId`, `responsibleId` ni `organizationId`.

#### Scenario: Autor edita su draft
- **WHEN** el `authorId` de una tarea con `visibility = "draft"` edita `title` y `description`
- **THEN** la edición se persiste

#### Scenario: Autor (no admin) NO puede editar su tarea active
- **WHEN** un `member` que es `authorId` de una tarea con `visibility = "active"` intenta editar `title` o `description`
- **THEN** la operación falla con error de autorización
- (Nota: hoy todos los autores son admin/owner; este scenario se vuelve realista cuando una propuesta futura permita autoría no-admin.)

#### Scenario: Otro admin edita tarea ajena en cualquier visibility
- **WHEN** un admin B edita la `description` de una tarea creada por el admin A con `visibility = "active"`
- **THEN** la edición se persiste y `authorId` permanece como A

#### Scenario: Admin edita dueAt en draft
- **WHEN** un admin edita `dueAt` de una tarea con `visibility = "draft"`
- **THEN** la edición se persiste

#### Scenario: Admin edita dueAt en active
- **WHEN** un admin edita `dueAt` de una tarea con `visibility = "active"`
- **THEN** la edición se persiste

#### Scenario: Admin NO puede editar dueAt en archived
- **WHEN** un admin intenta editar `dueAt` de una tarea con `visibility = "archived"`
- **THEN** la operación falla con error de validación y `dueAt` permanece inalterado

#### Scenario: Member regular no edita
- **WHEN** un `member` que NO es el autor intenta editar `title`, `description` o `dueAt` de una tarea (cualquier visibility)
- **THEN** la operación falla con error de autorización

#### Scenario: Edición no toca status, visibility, authorId, responsibleId, organizationId
- **WHEN** un admin envía un payload de edición que incluye `status`, `visibility`, `authorId`, `responsibleId` u `organizationId`
- **THEN** la acción ignora esos campos y sólo persiste cambios en `title`, `description` y/o `dueAt` según las reglas anteriores

### Requirement: Transición de `visibility`

El sistema SHALL permitir transicionar `visibility` SÓLO entre los siguientes pares: `draft → active`, `active → archived`, `active → draft`, `archived → active`. Las transiciones `draft → archived` y `archived → draft` SHALL ser rechazadas tanto en la server action (validación Zod + lógica) como en la base de datos (CHECK constraint que prohíbe los estados inconsistentes, complementado por validación de la action).

#### Scenario: Transición draft → active
- **WHEN** un admin transiciona una tarea con `visibility = "draft"` y `dueAt` definido a `active`
- **THEN** `visibility` queda en `active` y `updatedAt` se refresca

#### Scenario: Transición active → archived
- **WHEN** un admin transiciona una tarea con `visibility = "active"` a `archived`
- **THEN** `visibility` queda en `archived`

#### Scenario: Transición archived → active
- **WHEN** un admin transiciona una tarea con `visibility = "archived"` a `active`
- **THEN** `visibility` queda en `active`

#### Scenario: Transición active → draft
- **WHEN** un admin transiciona una tarea con `visibility = "active"` a `draft`
- **THEN** `visibility` queda en `draft`

#### Scenario: Transición bloqueada draft → archived
- **WHEN** un admin intenta transicionar una tarea con `visibility = "draft"` a `archived`
- **THEN** la acción falla con error de validación y `visibility` permanece en `draft`

#### Scenario: Transición bloqueada archived → draft
- **WHEN** un admin intenta transicionar una tarea con `visibility = "archived"` a `draft`
- **THEN** la acción falla con error de validación y `visibility` permanece en `archived`

### Requirement: `dueAt` y `responsibleId` obligatorios al activar

El sistema SHALL rechazar la transición `draft → active` (o `archived → active`) si la tarea no tiene `dueAt` Y `responsibleId` asignados al momento de evaluar la transición. La transición SHALL aceptar opcionalmente `dueAt` y/o `responsibleId` en el mismo payload; los valores provistos en el payload SHALL aplicarse ANTES de evaluar la transición. La validación SHALL ejecutarse en la server action; la base de datos NO SHALL forzar esta regla, lo que permite que tareas legacy en `active` sin `responsibleId` (creadas antes de este cambio) sigan existiendo.

#### Scenario: Activación sin dueAt y sin responsibleId
- **WHEN** un admin intenta transicionar `draft → active` sobre una tarea sin `dueAt` y sin `responsibleId`, sin proveer ninguno en el payload
- **THEN** la acción falla con error de validación indicando los campos faltantes

#### Scenario: Activación con dueAt pero sin responsibleId
- **WHEN** un admin intenta transicionar `draft → active` con `dueAt` definido pero sin `responsibleId`
- **THEN** la acción falla con error de validación indicando que `responsibleId` es requerido

#### Scenario: Activación con responsibleId pero sin dueAt
- **WHEN** un admin intenta transicionar `draft → active` con `responsibleId` definido pero sin `dueAt`
- **THEN** la acción falla con error de validación indicando que `dueAt` es requerido

#### Scenario: Activación proveyendo dueAt y responsibleId en el payload
- **WHEN** un admin transiciona `draft → active` proveyendo `dueAt` y `responsibleId` en el mismo payload
- **THEN** ambos valores se persisten y `visibility` queda en `active`

#### Scenario: Tarea draft puede no tener dueAt ni responsibleId
- **WHEN** un admin crea o edita una tarea con `visibility = "draft"` sin proveer `dueAt` ni `responsibleId`
- **THEN** la operación se persiste con `dueAt = NULL` y `responsibleId = NULL`

#### Scenario: Tarea legacy active sin responsibleId no es invalidada
- **WHEN** existe en base una tarea con `visibility = "active"` y `responsibleId = NULL` creada antes de este cambio
- **THEN** sigue siendo legible y editable; la regla de "responsibleId requerido al activar" se aplica únicamente al ejecutar una nueva transición hacia `active`

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

### Requirement: Tomar posesión de tarea

El sistema SHALL exponer una acción "Tomar posesión" que permite a cualquier `admin` u `owner` de la organización de una tarea reasignar `authorId` a su propio `user.id`. La acción SHALL ser idempotente cuando el invocador ya es el autor (no genera cambios ni error).

#### Scenario: Admin toma posesión de tarea ajena
- **WHEN** un admin B invoca "Tomar posesión" sobre una tarea con `authorId = A` en la misma organización
- **THEN** `authorId` queda igual a B y `updatedAt` se refresca

#### Scenario: Tomar posesión siendo ya autor
- **WHEN** el actual `authorId` invoca "Tomar posesión" sobre su propia tarea
- **THEN** la operación es idempotente: no cambia ningún campo y no devuelve error

#### Scenario: No admin no puede tomar posesión
- **WHEN** un `member` regular intenta "Tomar posesión"
- **THEN** la operación falla con error de autorización

### Requirement: Listado de tareas con filtros (admin)

El sistema SHALL exponer un listado de tareas accesible a `admin`/`owner` de la `activeOrganizationId` del invocador que retorna TODAS las tareas de esa organización, sin filtrar por participación. El listado SHALL aceptar filtros opcionales por `visibility` (uno o varios valores del enum) y por `status` (uno o varios valores del enum). Si no se proveen filtros, SHALL retornar todas las tareas de la organización. El orden default SHALL ser `createdAt DESC`. Los registros retornados SHALL incluir `responsibleId` (o `NULL`), `responsibleName`, `responsibleEmail`, y la lista de `assignees`. El listado para `member` está definido en el capability `task-assignments`.

#### Scenario: Listado admin sin filtros
- **WHEN** un admin solicita el listado sin filtros
- **THEN** retorna todas las tareas de la organización ordenadas por `createdAt DESC`, incluyendo responsable y assignees por tarea

#### Scenario: Filtro por visibility
- **WHEN** un admin solicita el listado con filtro `visibility = ["active"]`
- **THEN** retorna sólo tareas con `visibility = "active"` de la organización

#### Scenario: Filtro combinado
- **WHEN** un admin solicita el listado con `visibility = ["active", "draft"]` y `status = ["in_progress"]`
- **THEN** retorna tareas con `visibility` en `{active, draft}` Y `status = "in_progress"` de la organización

#### Scenario: Listado accesible a otro admin
- **WHEN** un admin B (distinto del autor) solicita el listado
- **THEN** ve TODAS las tareas de la organización, no sólo las de `authorId = B`

#### Scenario: Member regular no accede al listado admin
- **WHEN** un `member` regular solicita el listado `/admin/tasks`
- **THEN** la operación falla con error de autorización y es redirigido fuera del panel admin

### Requirement: Eliminar tarea en draft

El sistema SHALL exponer una acción `deleteTask` que elimina físicamente una tarea (incluyendo sus filas en `task_assignee`, `task_comment` y `task_document` vía `ON DELETE CASCADE`). La acción SHALL permitirse SÓLO si la tarea tiene `visibility = 'draft'` Y el invocador es el `authorId` de la tarea O es `admin`/`owner` de la organización de la tarea. La eliminación es física e irreversible.

Antes de ejecutar el `DELETE FROM task ...`, la acción SHALL leer todos los `task_document.storageKey` asociados al `taskId` e invocar `deletePrivateAsset` por cada uno usando `Promise.allSettled` (best-effort, en paralelo). Si una o más eliminaciones en R2 fallan, la acción SHALL loggear un warning con los keys afectados pero NO SHALL abortar el borrado de la tarea: el operador ya solicitó eliminar la tarea y un blob huérfano en R2 no es razón para frustrar la operación. Tras la limpieza best-effort, la acción SHALL ejecutar el `DELETE FROM task` y la cascada eliminará las filas de `task_document`.

#### Scenario: Autor elimina su draft sin documentos
- **WHEN** el `authorId` invoca `deleteTask` sobre una tarea propia con `visibility = "draft"` que no tiene documentos
- **THEN** la tarea se elimina de `task` y sus filas en `task_assignee` y `task_comment` se eliminan en cascada; no se invoca `deletePrivateAsset` porque no hay documentos

#### Scenario: Admin elimina draft ajeno con documentos
- **WHEN** un admin B invoca `deleteTask` sobre una tarea con `visibility = "draft"`, `authorId = A` y dos documentos asociados
- **THEN** se invoca `deletePrivateAsset` por cada `storageKey` antes del DELETE; la tarea se elimina y las filas `task_document` se eliminan por la FK CASCADE

#### Scenario: Falla en R2 no bloquea el borrado de la tarea
- **WHEN** se invoca `deleteTask` sobre una tarea draft con tres documentos y `deletePrivateAsset` falla para uno de ellos
- **THEN** el fallo se loggea con el `storageKey` afectado, la tarea se elimina igual y las filas `task_document` se eliminan por la cascada (el blob huérfano queda en R2)

#### Scenario: No se puede eliminar tarea active
- **WHEN** cualquier usuario invoca `deleteTask` sobre una tarea con `visibility = "active"`
- **THEN** la operación falla con error de validación y la tarea permanece (no se tocan ni `task_document` ni R2)

#### Scenario: No se puede eliminar tarea archived
- **WHEN** cualquier usuario invoca `deleteTask` sobre una tarea con `visibility = "archived"`
- **THEN** la operación falla con error de validación y la tarea permanece

#### Scenario: Member no autor no puede eliminar
- **WHEN** un `member` regular que NO es el autor invoca `deleteTask` sobre una tarea en `draft`
- **THEN** la operación falla con error de autorización

### Requirement: UI mínima en `/admin` con copy en español neutral

El sistema SHALL exponer una sub-vista bajo `/admin/tasks` con: (a) listado de tareas de la organización con control directo para filtrar por `visibility` cuando aplique, (b) acción para crear una nueva tarea (form con `title`, `description`, `dueAt` opcional, `visibility` inicial), (c) edición y transiciones desde el detalle/fila, (d) acción "Tomar posesión" visible para admins/owners distintos del autor. Todo el copy de UI SHALL usar español neutral en segunda persona singular `tú` (ej. "Crea", "Selecciona", "Elige"); NO SHALL usar voseo ni otras formas regionales.

El listado admin SHALL NO aplicar filtro de `status` por defecto cuando la URL no incluya `status`. El tablero SHALL mostrar todas las columnas por estado en esa condición. Si la URL incluye un filtro `status` explícito, el sistema MAY honrarlo para compatibilidad con enlaces existentes, pero el control primario visible del listado SHALL ser el filtro de `visibility`.

#### Scenario: Acceso a /admin/tasks
- **WHEN** un admin u owner navega a `/admin/tasks`
- **THEN** se renderiza el listado con el control directo de `visibility` aplicable y la acción de crear

#### Scenario: Acceso denegado a member
- **WHEN** un `member` regular navega a `/admin/tasks`
- **THEN** se le redirige fuera del panel admin (consistente con el resto de rutas `/admin/*`)

#### Scenario: Admin sin status explícito ve todas las tareas
- **WHEN** un admin navega a `/admin/tasks` sin search param `status`
- **THEN** la consulta de listado no filtra por `status` y el tablero muestra todas las columnas

#### Scenario: Status explícito se conserva por compatibilidad
- **WHEN** un admin navega a `/admin/tasks?status=in_progress`
- **THEN** el listado puede limitarse a tareas en curso y el tablero muestra la columna correspondiente

#### Scenario: Copy en español neutral
- **WHEN** se inspecciona el copy visible en `/admin/tasks` (botones, labels, placeholders, mensajes de error)
- **THEN** todas las cadenas usan formas neutras (`tú`, "Crea", "Selecciona", "Elige", "Edita", "Cierra") y NO contienen voseo (`vos`, `Ingresá`, `Seleccioná`, `Eligí`, `Editá`)

### Requirement: UI de edición de tarea desde el detalle

El sistema SHALL exponer en el detail pane de una tarea un control "Editar" que abre un diálogo (`EditTaskDialog`) con campos para `title`, `description` y `dueAt`. El diálogo SHALL invocar la server action `updateTaskContent` ya existente; el servidor sigue siendo la fuente de verdad de las reglas (autor en draft o admin/owner para contenido; admin/owner y NO archived para `dueAt`).

El diálogo SHALL renderizar sus campos según las capabilities del viewer:

- El botón "Editar" SHALL aparecer si y solo si el viewer tiene capability `canEditContent` O `canEditDueAt` sobre la tarea.
- Los campos `title` y `description` SHALL estar habilitados si `canEditContent`; deshabilitados en caso contrario.
- El campo `dueAt` SHALL estar VISIBLE si `canEditDueAt`; OCULTO en caso contrario (no solo deshabilitado, porque en archived el campo no aplica).
- El diálogo NO SHALL exponer campos para `visibility`, `status`, `responsibleId`, `authorId` ni `assignees`; esos flujos viven en otros controles del detail pane.

El campo `description` del diálogo de edición y del diálogo de creación (`CreateTaskDialog`) SHALL usar un `<Textarea>` con altura mínima ampliada (no menos de 8 filas visibles) y SHALL permitir redimensionado vertical por el usuario, con tope de altura máxima razonable para no romper el layout del diálogo.

Al cerrar el diálogo tras un guardado exitoso, la UI SHALL refrescar la vista para mostrar los valores actualizados.

#### Scenario: Admin abre y guarda edición de título y descripción
- **WHEN** un admin selecciona una tarea con `visibility = "active"`, abre el diálogo "Editar", modifica `title` y `description`, y confirma
- **THEN** la server action `updateTaskContent` se invoca con los nuevos valores y, al recibir éxito, el detail pane refleja los cambios

#### Scenario: Admin edita dueAt en draft
- **WHEN** un admin abre el diálogo "Editar" sobre una tarea en `draft` y modifica `dueAt`
- **THEN** el campo `dueAt` es visible, la action se invoca con el nuevo `dueAt` y el cambio se refleja

#### Scenario: Admin NO ve campo dueAt en archived
- **WHEN** un admin abre el diálogo "Editar" sobre una tarea con `visibility = "archived"`
- **THEN** el campo `dueAt` NO está presente en el formulario (oculto, no deshabilitado)

#### Scenario: Autor (no admin) edita su draft desde el dialog
- **WHEN** el `authorId` (member regular) de una tarea en `draft` abre el diálogo "Editar"
- **THEN** los campos `title` y `description` están habilitados, el campo `dueAt` NO se muestra, y al confirmar la action se invoca y el cambio se persiste

#### Scenario: Autor (no admin) NO ve botón Editar en tarea active propia
- **WHEN** un `member` que es `authorId` de una tarea con `visibility = "active"` abre el detail pane
- **THEN** el botón "Editar" NO se muestra (no tiene `canEditContent` ni `canEditDueAt`)

#### Scenario: Member sin autoría NO ve botón Editar
- **WHEN** un `member` regular (no autor, no admin) que es responsable o assignee abre el detail pane
- **THEN** el botón "Editar" NO se muestra

#### Scenario: Botón Editar oculto si no hay capabilities aplicables
- **WHEN** el viewer no tiene ni `canEditContent` ni `canEditDueAt` sobre la tarea seleccionada
- **THEN** el botón "Editar" NO aparece en el detail pane

#### Scenario: Textarea de descripción ampliado en creación
- **WHEN** un admin abre `CreateTaskDialog`
- **THEN** el `<Textarea>` de descripción se renderiza con altura mínima equivalente a al menos 8 filas y permite redimensionado vertical

#### Scenario: Textarea de descripción ampliado en edición
- **WHEN** un admin u autor abre `EditTaskDialog`
- **THEN** el `<Textarea>` de descripción se renderiza con la misma altura mínima y redimensionado vertical que en creación

#### Scenario: Copy en español neutral
- **WHEN** se inspecciona el copy del diálogo de edición (label de botón, título del diálogo, labels de campos, mensajes de error)
- **THEN** todas las cadenas usan formas neutras (`tú`, "Edita", "Guarda", "Cierra") y NO contienen voseo

### Requirement: Scroll de descripción en el detail pane

El sistema SHALL renderizar el contenido de `description` en el detail pane dentro de un contenedor con `overflow-y-auto` propio, de modo que descripciones largas scrolleen DENTRO del bloque de descripción mientras el header del detail pane (título, badges de visibility/status y la barra de acciones) permanece visible en la parte superior del panel.

#### Scenario: Descripción larga scrollea sin perder header
- **WHEN** una tarea con descripción de varios párrafos se selecciona en el detail pane
- **THEN** el usuario puede scrollear hacia abajo dentro del bloque de descripción y el header con título, badges y barra de acciones sigue visible en la parte superior

#### Scenario: Descripción corta no muestra scroll
- **WHEN** una tarea con descripción breve (cabe en una pantalla) se selecciona en el detail pane
- **THEN** el bloque de descripción NO muestra barra de scroll visible

### Requirement: Layout responsivo de la bandeja de tareas
El sistema SHALL renderizar las rutas base `/tasks` y `/admin/tasks` como una vista visual de listado, no como una bandeja lista-detalle. La vista base SHALL mostrar controles de filtros, toggle de modo visual y tarjetas de tareas según el modo seleccionado (`board` o `cards`).

- **Desktop (`lg` y mayor, ≥1024px):** SHALL mostrar el listado visual ocupando el área principal disponible. En modo `board`, las columnas por status se muestran en paralelo cuando el ancho lo permita; en modo `cards`, las tarjetas se muestran en grilla responsive.
- **Tablet y mobile (`< lg`, <1024px):** SHALL mostrar el listado visual en una sola columna de lectura. En modo `board`, las columnas se apilan verticalmente; en modo `cards`, las tarjetas se muestran una debajo de otra.
- Las rutas con segmento `[taskId]` SHALL renderizar una página de detalle dedicada, no una lista lateral con detalle embebido.
- La decisión de qué página renderizar SHALL surgir de la ruta: ruta base para listado, ruta `[taskId]` para detalle. El sistema NO SHALL depender de JavaScript cliente para cambiar entre listado y detalle.

#### Scenario: Desktop muestra tablero visual en ruta base
- **WHEN** un usuario en desktop navega a `/tasks` o `/admin/tasks` sin `taskId`
- **THEN** se renderiza el listado visual con controles de filtros y modo, sin panel de detalle lateral

#### Scenario: Desktop muestra detalle dedicado con taskId
- **WHEN** un usuario en desktop navega a `/tasks/<id>` o `/admin/tasks/<id>` con permiso de lectura
- **THEN** se renderiza una página de detalle dedicada para esa tarea, sin lista lateral de tareas

#### Scenario: Mobile base muestra listado visual
- **WHEN** un usuario en viewport <1024px navega a `/tasks` o `/admin/tasks`
- **THEN** se renderiza el listado visual adaptado a una columna o columnas apiladas según el modo

#### Scenario: Mobile detalle muestra página vertical
- **WHEN** un usuario en viewport <1024px navega a `/tasks/<id>` o `/admin/tasks/<id>`
- **THEN** se renderiza únicamente el detalle de esa tarea en una composición vertical optimizada para móvil

#### Scenario: Resize conserva la URL y la intención
- **WHEN** un usuario cambia el tamaño del viewport mientras está en `/tasks/<id>`
- **THEN** la UI reorganiza el layout del detalle sin cambiar la URL ni perder la tarea seleccionada

### Requirement: Ruta dedicada para detalle de tarea
El sistema SHALL exponer la ruta `/tasks/[taskId]` y `/admin/tasks/[taskId]` como segmento de URL canónico para representar el detalle dedicado de una tarea seleccionada. Esta ruta reemplaza al mecanismo previo basado en query param `?taskId=<id>` y ya no renderiza una bandeja lista-detalle.

La selección de una tarea desde el listado visual SHALL navegar al segmento dinámico (`/tasks/<id>` o `/admin/tasks/<id>`), preservando los searchParams existentes, incluyendo filtros y modo de vista (`view=board|cards`). Volver al listado SHALL navegar a la ruta base correspondiente preservando los searchParams vigentes.

El control visual para volver al listado SHALL estar integrado dentro de la card principal/header del detalle full-page. Si se renderiza como botón compacto o solo icono, SHALL tener nombre accesible equivalente a `Volver al listado`.

El sistema NO SHALL leer el query param `?taskId=` como mecanismo de selección. Si una URL legacy con `?taskId=<id>` llega al servidor, el handler SHALL redirigir con HTTP 308 a la ruta canónica equivalente (`/tasks?taskId=X` → `/tasks/X`, `/admin/tasks?taskId=X` → `/admin/tasks/X`), preservando el resto de los searchParams.

#### Scenario: Click en tarjeta navega a /tasks/[taskId]
- **WHEN** un usuario hace click en una tarjeta de tarea en `/tasks` con filtros activos en la URL
- **THEN** el navegador navega a `/tasks/<id>` preservando los searchParams de filtros y modo de vista

#### Scenario: Click en tarjeta navega a /admin/tasks/[taskId]
- **WHEN** un admin hace click en una tarjeta en `/admin/tasks` con filtros activos
- **THEN** el navegador navega a `/admin/tasks/<id>` preservando los searchParams de filtros y modo de vista

#### Scenario: Deep-link a /tasks/[taskId] renderiza detalle full-page
- **WHEN** un usuario con visibilidad sobre la tarea navega directamente a `/tasks/<id>`
- **THEN** el detalle se renderiza server-side como página dedicada responsive

#### Scenario: Deep-link a tarea sin permiso
- **WHEN** un usuario sin visibilidad sobre la tarea navega directamente a `/tasks/<id>` o `/admin/tasks/<id>`
- **THEN** el sistema responde con 404 o equivalente sin filtrar la existencia de la tarea

#### Scenario: Redirect legacy de query param a ruta
- **WHEN** un usuario navega a `/tasks?taskId=<id>` o `/admin/tasks?taskId=<id>`
- **THEN** el servidor responde con HTTP 308 a `/tasks/<id>` o `/admin/tasks/<id>` respectivamente, preservando los demás searchParams

#### Scenario: Volver al listado preserva filtros y modo
- **WHEN** un usuario en `/tasks/<id>?view=cards&status=in_progress` invoca la acción de volver al listado
- **THEN** el navegador navega a `/tasks?view=cards&status=in_progress`

#### Scenario: Botón volver está dentro de la card principal
- **WHEN** un usuario abre `/tasks/<id>` o `/admin/tasks/<id>`
- **THEN** la acción para volver al listado aparece dentro del header/card principal del detalle con nombre accesible

### Requirement: Panel de filtros unificado
El sistema SHALL NO depender de un panel `Sheet` o modal como punto principal para filtrar tareas en `/tasks` ni en `/admin/tasks`. La barra superior del listado visual SHALL renderizar controles directos y compactos: un dropdown multiselect de `visibility` cuando sea aplicable y un dropdown único para elegir el modo de vista (`board` o `cards`).

El estado seleccionado de `visibility` SHALL reflejarse visualmente en el trigger del dropdown, por ejemplo mediante etiqueta resumida o conteo. El sistema SHALL preservar submit por interacción y persistencia en URL. El filtro de `visibility` SHALL mostrarse solo cuando sea aplicable según permisos efectivos del viewer.

#### Scenario: Desktop NO muestra Sheet de filtros
- **WHEN** un usuario en viewport ≥1024px abre `/tasks` o `/admin/tasks`
- **THEN** NO se renderiza un `Sheet` de filtros como punto principal; los controles directos aparecen en la barra superior del listado visual

#### Scenario: Mobile usa controles directos alcanzables
- **WHEN** un usuario en viewport <768px abre `/tasks` o `/admin/tasks`
- **THEN** los controles directos de visibilidad y vista son visibles o alcanzables desde la barra del listado y tienen tamaño táctil adecuado

#### Scenario: Visibilidad activa reflejada en dropdown
- **WHEN** un usuario aplica al menos un filtro de `visibility`
- **THEN** el trigger del dropdown de visibilidad refleja que hay selección activa

#### Scenario: Aplicar visibilidad actualiza URL
- **WHEN** un usuario selecciona o deselecciona una opción de `visibility`
- **THEN** la URL se actualiza con los searchParams correspondientes y la lista se refresca

#### Scenario: Copy en español neutral
- **WHEN** se inspecciona el copy de los controles directos
- **THEN** todas las cadenas usan formas neutras (`tú`, `Visibilidad`, `Vista`, `Tablero`, `Tarjetas`) y NO contienen voseo

### Requirement: Helper interno `createTaskInternal` sin guard de autorización

El módulo de tareas SHALL exponer, para consumo server-side interno, una función `createTaskInternal` que realiza la inserción de una fila `task` con los campos provistos, SIN invocar el guard `requireOrgAdmin` y SIN validar el rol del invocador. La función SHALL recibir explícitamente `authorId`, `responsibleId`, `organizationId`, `title`, `description`, `visibility`, `status` y `dueAt` como parte del payload, y SHALL persistir esos valores tal como se reciben (respetando las restricciones de tipo y `NOT NULL` de la base).

La server action pública `createTask` SHALL mantener su guard `requireOrgAdmin` y, una vez pasado el guard y validado el payload, SHALL delegar la inserción concreta en `createTaskInternal`. La firma pública de `createTask` y su contrato externo NO SHALL cambiar.

`createTaskInternal` SHALL NO exportarse como server action al cliente: SHALL ser invocable solo desde otros módulos server-side dentro de `next-app/src/lib/**` o `next-app/src/app/**` (server-only).

#### Scenario: createTaskInternal inserta sin verificar rol
- **WHEN** un caller server-side invoca `createTaskInternal` con un payload válido sin que exista un `requireOrgAdmin` previo en el call stack
- **THEN** la fila se inserta en `task` con los valores provistos y la operación retorna éxito

#### Scenario: createTask público sigue exigiendo admin/owner
- **WHEN** un usuario con `member.role = "member"` (o sin membresía) invoca la server action pública `createTask`
- **THEN** la action falla con error de autorización antes de invocar `createTaskInternal` y no se persiste ninguna fila

#### Scenario: createTask delega en createTaskInternal
- **WHEN** un admin invoca la server action pública `createTask` con un payload válido
- **THEN** tras pasar `requireOrgAdmin` y validar el payload, la inserción concreta se realiza a través de `createTaskInternal`, evitando duplicar la lógica de inserción

#### Scenario: createTaskInternal acepta visibility="active" si dueAt y responsibleId están presentes
- **WHEN** un caller invoca `createTaskInternal` con `visibility = "active"`, `dueAt` definido y `responsibleId` definido
- **THEN** la fila se persiste con `visibility = "active"`; la regla de "dueAt y responsibleId obligatorios al activar" se cumple por construcción del payload

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
