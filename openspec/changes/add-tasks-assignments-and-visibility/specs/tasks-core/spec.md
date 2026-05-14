## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Eliminar tarea en draft

El sistema SHALL exponer una acción `deleteTask` que elimina físicamente una tarea (incluyendo sus filas en `task_assignee` vía `ON DELETE CASCADE`). La acción SHALL permitirse SÓLO si la tarea tiene `visibility = 'draft'` Y el invocador es el `authorId` de la tarea O es `admin`/`owner` de la organización de la tarea. La eliminación es física e irreversible.

#### Scenario: Autor elimina su draft
- **WHEN** el `authorId` invoca `deleteTask` sobre una tarea propia con `visibility = "draft"`
- **THEN** la tarea se elimina de `task` y sus filas en `task_assignee` se eliminan en cascada

#### Scenario: Admin elimina draft ajeno
- **WHEN** un admin B invoca `deleteTask` sobre una tarea con `visibility = "draft"` y `authorId = A`
- **THEN** la tarea se elimina

#### Scenario: No se puede eliminar tarea active
- **WHEN** cualquier usuario invoca `deleteTask` sobre una tarea con `visibility = "active"`
- **THEN** la operación falla con error de validación y la tarea permanece

#### Scenario: No se puede eliminar tarea archived
- **WHEN** cualquier usuario invoca `deleteTask` sobre una tarea con `visibility = "archived"`
- **THEN** la operación falla con error de validación y la tarea permanece

#### Scenario: Member no autor no puede eliminar
- **WHEN** un `member` regular que NO es el autor invoca `deleteTask` sobre una tarea en `draft`
- **THEN** la operación falla con error de autorización
