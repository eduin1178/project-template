## ADDED Requirements

### Requirement: Estado de vencimiento derivado

El sistema SHALL considerar a una tarea "vencida" cuando `task.dueAt IS NOT NULL` Y `task.dueAt <= NOW()` evaluado server-side en el instante de la operación. La condición SHALL ser puramente derivada: NO SHALL existir columna persistida, trigger de mutación ni job programado que materialice un estado "vencida". Cada server action y cada cómputo de capabilities SHALL re-evaluar la condición en el momento de su ejecución.

El instante de referencia SHALL ser la hora del servidor (vía `NOW()` de Postgres en la query o `new Date()` de Node en el handler, indistinto). El sistema NO SHALL ajustar la comparación por zona horaria del cliente. Tareas con `dueAt = NULL` NUNCA SHALL considerarse vencidas.

#### Scenario: Tarea con dueAt futuro no está vencida
- **WHEN** una tarea tiene `dueAt = NOW() + 1 día`
- **THEN** la condición de vencimiento evalúa false

#### Scenario: Tarea con dueAt exactamente NOW está vencida
- **WHEN** una tarea tiene `dueAt = NOW()` (igualdad estricta)
- **THEN** la condición de vencimiento evalúa true (el operador es `<=`)

#### Scenario: Tarea con dueAt pasado está vencida
- **WHEN** una tarea tiene `dueAt = NOW() - 1 minuto`
- **THEN** la condición de vencimiento evalúa true

#### Scenario: Tarea con dueAt nulo nunca está vencida
- **WHEN** una tarea tiene `dueAt = NULL`
- **THEN** la condición de vencimiento evalúa false independientemente de cualquier otro factor

### Requirement: Bypass de vencimiento por rol y autoría

El sistema SHALL exponer una función pura `canActOnExpired(viewer, task)` que retorne `true` si y solo si CUALQUIERA de las siguientes condiciones se cumple:

1. `viewer.role` en la organización de la tarea es `admin` u `owner`, O
2. `viewer.id === task.authorId`.

Cualquier server action o proyección de capability que aplique el gate de vencimiento SHALL evaluar el predicado compuesto: `!isExpired(task) || canActOnExpired(viewer, task)`. Es decir, si la tarea no está vencida la operación procede según la regla base; si está vencida, solo procede si el viewer pasa el bypass.

El bypass aplica por ROL, no por participación: un member regular que sea responsable o assignee de la tarea NO SHALL pasar el bypass aunque haya sido el último en operar. Solo admin/owner por rol O autor por autoría pasan.

#### Scenario: Admin opera sobre tarea vencida
- **WHEN** un admin invoca cualquier acción afectada por el gate sobre una tarea vencida
- **THEN** `canActOnExpired` retorna true y la operación procede según su regla base

#### Scenario: Owner opera sobre tarea vencida
- **WHEN** un owner invoca cualquier acción afectada por el gate sobre una tarea vencida
- **THEN** `canActOnExpired` retorna true

#### Scenario: Autor member regular opera sobre tarea vencida
- **WHEN** un `member` regular que es `task.authorId` invoca una acción afectada por el gate sobre la tarea vencida
- **THEN** `canActOnExpired` retorna true

#### Scenario: Responsable member regular no bypassea
- **WHEN** un `member` regular que es `task.responsibleId` pero NO es autor ni admin invoca una acción afectada por el gate sobre la tarea vencida
- **THEN** `canActOnExpired` retorna false

#### Scenario: Assignee member regular no bypassea
- **WHEN** un `member` regular presente en `task_assignee` pero que NO es autor ni admin invoca una acción afectada por el gate sobre la tarea vencida
- **THEN** `canActOnExpired` retorna false

### Requirement: Autorización para cambiar `status` con gate de vencimiento

El sistema SHALL determinar quién puede invocar `changeTaskStatus` (definida en `tasks-core`) según el siguiente predicado compuesto evaluado server-side:

- Si la tarea NO tiene `visibility = 'active'`: SHALL rechazar la operación (no se puede cambiar status en `draft` ni en `archived`).
- Si la tarea SÍ está en `active`: SHALL permitir invocar la action si y solo si el viewer cumple AL MENOS UNA de las siguientes:
  1. `viewer.role ∈ {admin, owner}` en la organización de la tarea, O
  2. `viewer.id === task.authorId`, O
  3. `viewer.id === task.responsibleId` Y la tarea NO está vencida, O
  4. Existe una fila `(taskId, viewer.id)` en `task_assignee` Y la tarea NO está vencida.

Es decir: admin/owner y autor pueden cambiar status SIEMPRE (sin gate de vencimiento). Responsable y assignees member regular pueden cambiar status SOLO si la tarea no está vencida.

#### Scenario: Admin cambia status en tarea vencida
- **WHEN** un admin invoca `changeTaskStatus` con `commentBody` válido sobre una tarea vencida en `active`
- **THEN** la operación se autoriza y procede

#### Scenario: Autor member cambia status en tarea vencida
- **WHEN** un `member` regular que es `authorId` invoca `changeTaskStatus` sobre su tarea vencida en `active` con `commentBody` válido
- **THEN** la operación se autoriza y procede

#### Scenario: Responsable member en plazo cambia status
- **WHEN** un `member` regular que es `responsibleId` invoca `changeTaskStatus` sobre una tarea no vencida con `commentBody` válido
- **THEN** la operación se autoriza y procede

#### Scenario: Responsable member fuera de plazo no puede cambiar status
- **WHEN** un `member` regular que es `responsibleId` (no autor, no admin) invoca `changeTaskStatus` sobre una tarea vencida
- **THEN** la operación falla con error de autorización y `task.status` permanece inalterado

#### Scenario: Assignee member en plazo cambia status
- **WHEN** un `member` regular presente en `task_assignee` invoca `changeTaskStatus` sobre una tarea no vencida con `commentBody` válido
- **THEN** la operación se autoriza y procede

#### Scenario: Assignee member fuera de plazo no puede cambiar status
- **WHEN** un `member` regular presente en `task_assignee` (no autor, no admin, no responsable) invoca `changeTaskStatus` sobre una tarea vencida
- **THEN** la operación falla con error de autorización

#### Scenario: Member sin relación no puede cambiar status
- **WHEN** un `member` regular que no es autor, responsable ni assignee invoca `changeTaskStatus`
- **THEN** la operación falla con error de autorización

#### Scenario: Cambio de status bloqueado en draft
- **WHEN** cualquier viewer autorizado invoca `changeTaskStatus` sobre una tarea con `visibility = "draft"`
- **THEN** la operación falla con error de validación

#### Scenario: Cambio de status bloqueado en archived
- **WHEN** cualquier viewer autorizado invoca `changeTaskStatus` sobre una tarea con `visibility = "archived"`
- **THEN** la operación falla con error de validación

### Requirement: Contrato `TaskCapabilities` extendido con `canChangeStatus` y gate de vencimiento

El sistema SHALL extender el contrato `TaskCapabilities` proyectado por tarea visible con el siguiente campo booleano:

- `canChangeStatus: boolean` — `true` si y solo si el viewer puede invocar `changeTaskStatus` sobre la tarea según la regla definida en el requirement "Autorización para cambiar `status` con gate de vencimiento".

El cálculo SHALL incorporar el estado de vencimiento de la tarea en el instante de la proyección.

Adicionalmente, los flags YA existentes en `TaskCapabilities` que representan operaciones de mutación SHALL incorporar el gate de vencimiento con bypass:

- `canManageChecklist`: queda `false` para `member` regular (que no sea autor) cuando la tarea está vencida.
- `canUploadDocument`: queda `false` para `member` regular (que no sea autor) cuando la tarea está vencida.

Los flags `canDelete` proyectados por fila (sobre documentos en `task-documents` y sobre comentarios en `task-comments`) SHALL aplicar el mismo gate; cuando la tarea está vencida y el viewer es member regular no-autor, el flag SHALL ser `false` aunque el viewer sea el dueño del documento o comentario.

El flag `canComment` NO SHALL ser afectado por el vencimiento: comentar permanece habilitado mientras el viewer tenga visibilidad sobre la tarea según las reglas previas.

La UI SHALL leer estos flags para decidir habilitar/ocultar controles. La UI NO SHALL inspeccionar `task.dueAt` para tomar decisiones de habilitación.

#### Scenario: Admin sobre tarea vencida tiene canChangeStatus true
- **WHEN** se proyectan capabilities para un admin sobre una tarea active vencida
- **THEN** `canChangeStatus = true`, `canManageChecklist = true`, `canUploadDocument = true`

#### Scenario: Autor member sobre su tarea vencida tiene capacidades intactas
- **WHEN** se proyectan capabilities para un `member` regular que es `authorId` sobre su tarea active vencida
- **THEN** `canChangeStatus = true`, `canManageChecklist = true`, `canUploadDocument = true`

#### Scenario: Responsable member sobre tarea vencida tiene canChangeStatus false
- **WHEN** se proyectan capabilities para un `member` regular que es `responsibleId` (no autor, no admin) sobre una tarea active vencida
- **THEN** `canChangeStatus = false`, `canManageChecklist = false`, `canUploadDocument = false`, `canComment = true`

#### Scenario: Assignee member sobre tarea vencida tiene canChangeStatus false
- **WHEN** se proyectan capabilities para un `member` regular presente en `task_assignee` (no autor, no admin) sobre una tarea active vencida
- **THEN** `canChangeStatus = false`, `canManageChecklist = false`, `canUploadDocument = false`, `canComment = true`

#### Scenario: Responsable member sobre tarea en plazo tiene canChangeStatus true
- **WHEN** se proyectan capabilities para un `member` regular que es `responsibleId` sobre una tarea active no vencida
- **THEN** `canChangeStatus = true`

#### Scenario: canComment intacto al vencer
- **WHEN** se proyectan capabilities para cualquier viewer con visibilidad sobre una tarea active vencida
- **THEN** `canComment = true` (el vencimiento no afecta el flag de comentar)
