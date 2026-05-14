# tasks-core Specification

## Purpose

Modelo de tarea por organización y CRUD básico para `admin`/`owner` de la organización. Cubre creación, edición de contenido, transiciones de `visibility` y `status` con reglas de dominio, listado filtrable, y acción "Tomar posesión" para reasignar `authorId`. Sin asignaciones, documentos, comentarios, checklist ni enforcement de plazo (esas vienen en propuestas futuras).

## Requirements

### Requirement: Modelo `Task` por organización

El sistema SHALL exponer una entidad `Task` persistida en Postgres con los siguientes atributos: `id` (identificador único, texto), `title` (texto, requerido), `description` (texto, opcional), `dueAt` (timestamp con zona, opcional en `draft`, requerido al transicionar a `active`), `visibility` (enum: `draft` | `active` | `archived`, default `draft`), `status` (enum: `pending` | `in_progress` | `done`, default `pending`), `authorId` (referencia a `user.id`, requerido), `organizationId` (referencia a `organization.id`, requerido), `createdAt` y `updatedAt` (timestamps). Cada `Task` SHALL pertenecer a exactamente UNA `organization` y NUNCA SHALL ser visible ni accesible desde otra organización.

#### Scenario: Crear tarea con defaults
- **WHEN** un admin crea una tarea sin especificar `visibility` ni `status`
- **THEN** se persiste con `visibility = "draft"` y `status = "pending"`

#### Scenario: Tarea aislada por organización
- **WHEN** un admin de la organización A consulta tareas estando en sesión con `activeOrganizationId = A`
- **THEN** el listado NO incluye tareas cuyo `organizationId` sea distinto de A

#### Scenario: Persistencia de timestamps
- **WHEN** se inserta una nueva tarea
- **THEN** `createdAt` y `updatedAt` se asignan automáticamente al instante actual

#### Scenario: Update de timestamps
- **WHEN** se modifica cualquier atributo de una tarea existente
- **THEN** `updatedAt` se refresca al instante de la modificación y `createdAt` permanece inalterado

### Requirement: Autorización por rol de organización

El sistema SHALL permitir crear, editar, transicionar y reasignar tareas SÓLO a usuarios cuya `member.role` en la `activeOrganizationId` sea `admin` o `owner`. Usuarios sin esa membresía SHALL recibir un error de autorización (HTTP 403 equivalente en server actions) y la operación NO SHALL persistirse.

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

### Requirement: Edición de contenido por admin/owner

El sistema SHALL permitir a cualquier `admin` u `owner` de la organización de una tarea editar `title`, `description` y `dueAt` de esa tarea, sin importar si el usuario es el `authorId` o no. La edición NO SHALL alterar `visibility`, `status`, `authorId` ni `organizationId`.

#### Scenario: Otro admin edita tarea ajena
- **WHEN** un admin B edita la `description` de una tarea creada por el admin A en la misma organización
- **THEN** la edición se persiste y `authorId` permanece como A

#### Scenario: Edición no toca status ni visibility
- **WHEN** un admin envía un payload de edición que incluye `status` o `visibility`
- **THEN** la acción ignora esos campos y sólo persiste cambios en `title`, `description` y `dueAt`

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

### Requirement: `dueAt` obligatorio al activar

El sistema SHALL rechazar la transición `draft → active` si la tarea no tiene `dueAt` asignado. La transición SHALL aceptar opcionalmente un `dueAt` en el mismo payload, lo cual SHALL asignarlo antes de evaluar la transición.

#### Scenario: Activación sin dueAt
- **WHEN** un admin intenta transicionar `draft → active` sobre una tarea sin `dueAt` y sin proveer `dueAt` en el payload
- **THEN** la acción falla con error de validación indicando que `dueAt` es requerido

#### Scenario: Activación proveyendo dueAt
- **WHEN** un admin transiciona `draft → active` proveyendo `dueAt` en el mismo payload
- **THEN** `dueAt` se persiste y `visibility` queda en `active`

#### Scenario: Tarea draft puede no tener dueAt
- **WHEN** un admin crea o edita una tarea con `visibility = "draft"` sin proveer `dueAt`
- **THEN** la operación se persiste con `dueAt = NULL`

### Requirement: Transición de `status`

El sistema SHALL permitir transicionar `status` libremente entre cualesquiera pares de valores EXCEPTO la transición directa `pending → done`. La validación SHALL ocurrir en la server action; la base de datos SHALL aplicar un CHECK constraint sobre los valores permitidos del enum sin codificar la regla de transición (esa vive en la action).

#### Scenario: Transición pending → in_progress
- **WHEN** un admin transiciona una tarea de `status = "pending"` a `in_progress`
- **THEN** `status` queda en `in_progress`

#### Scenario: Transición in_progress → done
- **WHEN** un admin transiciona una tarea de `status = "in_progress"` a `done`
- **THEN** `status` queda en `done`

#### Scenario: Transición done → in_progress
- **WHEN** un admin transiciona una tarea de `status = "done"` a `in_progress`
- **THEN** `status` queda en `in_progress`

#### Scenario: Transición done → pending
- **WHEN** un admin transiciona una tarea de `status = "done"` a `pending`
- **THEN** `status` queda en `pending`

#### Scenario: Transición in_progress → pending
- **WHEN** un admin transiciona una tarea de `status = "in_progress"` a `pending`
- **THEN** `status` queda en `pending`

#### Scenario: Transición bloqueada pending → done
- **WHEN** un admin intenta transicionar una tarea de `status = "pending"` directamente a `done`
- **THEN** la acción falla con error de validación y `status` permanece en `pending`

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

### Requirement: Listado de tareas con filtros

El sistema SHALL exponer un listado de tareas que retorna todas las tareas de la `activeOrganizationId` del invocador, accesible sólo a `admin`/`owner` de esa organización. El listado SHALL aceptar filtros opcionales por `visibility` (uno o varios valores del enum) y por `status` (uno o varios valores del enum). Si no se proveen filtros, SHALL retornar todas las tareas de la organización. El orden default SHALL ser `createdAt DESC`.

#### Scenario: Listado sin filtros
- **WHEN** un admin solicita el listado sin filtros
- **THEN** retorna todas las tareas de la organización ordenadas por `createdAt DESC`

#### Scenario: Filtro por visibility
- **WHEN** un admin solicita el listado con filtro `visibility = ["active"]`
- **THEN** retorna sólo tareas con `visibility = "active"` de la organización

#### Scenario: Filtro combinado
- **WHEN** un admin solicita el listado con `visibility = ["active", "draft"]` y `status = ["in_progress"]`
- **THEN** retorna tareas con `visibility` en `{active, draft}` Y `status = "in_progress"` de la organización

#### Scenario: Listado accesible a otro admin
- **WHEN** un admin B (distinto del autor) solicita el listado
- **THEN** ve TODAS las tareas de la organización, no sólo las de `authorId = B`

#### Scenario: Member regular no accede al listado
- **WHEN** un `member` regular solicita el listado
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
