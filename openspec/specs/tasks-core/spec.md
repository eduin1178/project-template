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

El sistema SHALL exponer una sub-vista bajo `/admin/tasks` con: (a) listado de tareas de la organización con controles para filtrar por `visibility` y `status`, (b) acción para crear una nueva tarea (form con `title`, `description`, `dueAt` opcional, `visibility` inicial), (c) edición y transiciones desde el detalle/fila, (d) acción "Tomar posesión" visible para admins/owners distintos del autor. Todo el copy de UI SHALL usar español neutral en segunda persona singular `tú` (ej. "Crea", "Selecciona", "Elige"); NO SHALL usar voseo ni otras formas regionales.

#### Scenario: Acceso a /admin/tasks
- **WHEN** un admin u owner navega a `/admin/tasks`
- **THEN** se renderiza el listado con sus controles de filtro y la acción de crear

#### Scenario: Acceso denegado a member
- **WHEN** un `member` regular navega a `/admin/tasks`
- **THEN** se le redirige fuera del panel admin (consistente con el resto de rutas `/admin/*`)

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

El sistema SHALL renderizar las rutas `/tasks` y `/admin/tasks` mediante un layout que combine **lista** y **detalle** como secciones cooperantes con comportamiento responsivo según el ancho del viewport:

- **Desktop (`lg` y mayor, ≥1024px):** SHALL mostrar simultáneamente la lista de tareas y el detalle de la tarea seleccionada lado a lado. Los filtros NO SHALL renderizarse como columna lateral permanente; SHALL ser accesibles mediante el mismo botón "Filtros" descrito en el requirement "Panel de filtros unificado".
- **Tablet y mobile (`< lg`, <1024px):** SHALL mostrar **una sola sección a la vez**. Si la URL no incluye un `taskId`, SHALL mostrar únicamente la lista (ocupando todo el ancho disponible). Si la URL incluye un `taskId`, SHALL mostrar únicamente el detalle de esa tarea (ocupando todo el ancho disponible).
- En mobile, cuando se muestra el detalle, SHALL exponer un control "Volver a la lista" en la parte superior del panel que navegue a la ruta de lista (`/tasks` o `/admin/tasks` según corresponda) sin perder los filtros vigentes en la URL.

El layout NO SHALL depender de JavaScript en el cliente para decidir qué sección mostrar: la decisión SHALL surgir del estado de la URL (presencia o ausencia del segmento `[taskId]`) combinada con clases CSS responsivas. Esto permite que el deep-link a una tarea funcione directamente en mobile sin un parpadeo intermedio.

#### Scenario: Desktop muestra lista y detalle en paralelo sin panel lateral de filtros
- **WHEN** un usuario en desktop (viewport ≥1024px) navega a `/tasks/<id>` o `/admin/tasks/<id>` con permiso de lectura sobre la tarea
- **THEN** se renderizan simultáneamente la lista (con la fila seleccionada destacada) y el detalle de la tarea, lado a lado, sin un `aside` de filtros visible

#### Scenario: Mobile sin taskId muestra solo lista
- **WHEN** un usuario en viewport <1024px navega a `/tasks` o `/admin/tasks` (sin segmento `[taskId]`)
- **THEN** se renderiza únicamente la lista ocupando todo el ancho; el detalle no se muestra

#### Scenario: Mobile con taskId muestra solo detalle
- **WHEN** un usuario en viewport <1024px navega a `/tasks/<id>` o `/admin/tasks/<id>`
- **THEN** se renderiza únicamente el detalle ocupando todo el ancho; la lista no se muestra

#### Scenario: Mobile expone control para volver a la lista
- **WHEN** un usuario en mobile está viendo el detalle de una tarea
- **THEN** el detail pane muestra un control "Volver a la lista" o equivalente en su parte superior que navega a la ruta de lista preservando los searchParams de filtros vigentes

#### Scenario: Resize de viewport mientras hay tarea seleccionada
- **WHEN** un usuario está en desktop con `/tasks/<id>` y reduce el viewport a <1024px
- **THEN** la UI pasa a mostrar solo el detalle (la lista se oculta) sin perder la selección ni cambiar la URL

### Requirement: Ruta dedicada para detalle de tarea

El sistema SHALL exponer la ruta `/tasks/[taskId]` y `/admin/tasks/[taskId]` como segmento de URL canónico para representar el detalle de una tarea seleccionada. Esta ruta reemplaza al mecanismo previo basado en query param `?taskId=<id>`.

La selección de una tarea desde la lista SHALL navegar al segmento dinámico (`/tasks/<id>` o `/admin/tasks/<id>`), preservando los searchParams existentes (filtros). Limpiar la selección SHALL navegar a la ruta base de la lista preservando filtros.

El sistema NO SHALL leer el query param `?taskId=` como mecanismo de selección. Si una URL legacy con `?taskId=<id>` llega al servidor, el handler SHALL redirigir con HTTP 308 a la ruta canónica equivalente (`/tasks?taskId=X` → `/tasks/X`, `/admin/tasks?taskId=X` → `/admin/tasks/X`), preservando el resto de los searchParams.

#### Scenario: Click en fila navega a /tasks/[taskId]
- **WHEN** un usuario hace click en una fila de la lista en `/tasks` con filtros activos en la URL
- **THEN** el navegador navega a `/tasks/<id>` preservando los searchParams de filtros

#### Scenario: Click en fila navega a /admin/tasks/[taskId]
- **WHEN** un admin hace click en una fila de la lista en `/admin/tasks` con filtros activos
- **THEN** el navegador navega a `/admin/tasks/<id>` preservando los searchParams de filtros

#### Scenario: Deep-link a /tasks/[taskId] renderiza detalle
- **WHEN** un usuario con visibilidad sobre la tarea navega directamente a `/tasks/<id>`
- **THEN** el detalle se renderiza server-side; en desktop con la lista al costado, en mobile ocupando todo el ancho

#### Scenario: Deep-link a tarea sin permiso
- **WHEN** un usuario sin visibilidad sobre la tarea navega directamente a `/tasks/<id>` o `/admin/tasks/<id>`
- **THEN** el sistema responde con 404 (o equivalente) sin filtrar la existencia de la tarea

#### Scenario: Redirect legacy de query param a ruta
- **WHEN** un usuario navega a `/tasks?taskId=<id>` o `/admin/tasks?taskId=<id>`
- **THEN** el servidor responde con HTTP 308 a `/tasks/<id>` o `/admin/tasks/<id>` respectivamente, preservando los demás searchParams

#### Scenario: Limpieza de selección preserva filtros
- **WHEN** un usuario en `/tasks/<id>?status=in_progress` invoca la acción de cerrar o volver a la lista
- **THEN** el navegador navega a `/tasks?status=in_progress`

### Requirement: Panel de filtros unificado

El sistema SHALL renderizar el control de filtros de tareas (en `/tasks` y en `/admin/tasks`) mediante un único punto de entrada en TODOS los viewports: un botón "Filtros" ubicado en la barra superior de la lista, que al pulsarse abre un componente `Sheet` (drawer) lateral con el panel de filtros.

El sistema NO SHALL renderizar un panel lateral permanente (`aside`) de filtros en ningún viewport. El comportamiento es idéntico en mobile, tablet y desktop.

El contenido y la semántica de los filtros (submit por click en cada opción, persistencia en URL, etiquetas de conteo) SHALL ser los mismos que antes. El estado seleccionado SHALL reflejarse visualmente en el botón "Filtros" cuando hay al menos un filtro distinto del default activo (mediante un badge con el conteo de filtros activos).

#### Scenario: Desktop NO muestra filtros como columna lateral
- **WHEN** un usuario en viewport ≥1024px abre `/tasks` o `/admin/tasks`
- **THEN** NO se renderiza un `aside` de filtros visible; el botón "Filtros" aparece en la barra superior de la lista

#### Scenario: Mobile muestra botón Filtros que abre Sheet
- **WHEN** un usuario en viewport <768px abre `/tasks` o `/admin/tasks`
- **THEN** se muestra un botón "Filtros" en la barra de la lista que, al pulsarse, abre un `Sheet` lateral con los mismos filtros

#### Scenario: Botón Filtros visible en todos los viewports
- **WHEN** un usuario abre `/tasks` o `/admin/tasks` en cualquier viewport (mobile, tablet o desktop)
- **THEN** el botón "Filtros" está presente en la barra superior de la lista

#### Scenario: Filtros activos reflejados en el botón
- **WHEN** un usuario aplica al menos un filtro distinto del default
- **THEN** el botón "Filtros" muestra un badge con el conteo de filtros activos

#### Scenario: Aplicar filtros actualiza URL y cierra Sheet
- **WHEN** un usuario abre el `Sheet` de filtros (en cualquier viewport), selecciona una opción y la confirma
- **THEN** la URL se actualiza con los searchParams correspondientes, la lista se refresca y el `Sheet` se cierra

#### Scenario: Copy en español neutral
- **WHEN** se inspecciona el copy del botón y el `Sheet` de filtros
- **THEN** todas las cadenas usan formas neutras (`tú`, "Filtros", "Aplica", "Cierra") y NO contienen voseo

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
