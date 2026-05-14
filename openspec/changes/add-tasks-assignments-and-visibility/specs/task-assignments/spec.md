## ADDED Requirements

### Requirement: Modelo de responsable

El sistema SHALL exponer un campo `task.responsibleId` (texto, opcional, FK a `user.id` con `ON DELETE SET NULL`) que representa el usuario responsable de la tarea. El `responsibleId` SHALL ser distinto de `authorId` o coincidir con él (sin restricción). El `responsibleId` SHALL apuntar a un usuario que sea `member` (de cualquier rol) de la `organizationId` de la tarea al momento de la asignación; esta invariante SHALL validarse en la server action.

#### Scenario: Responsable opcional al crear draft
- **WHEN** un admin crea una tarea en `draft` sin `responsibleId`
- **THEN** se persiste con `responsibleId = NULL`

#### Scenario: Responsable debe ser member de la org
- **WHEN** un admin intenta asignar como responsable a un usuario que NO es member de la organización de la tarea
- **THEN** la operación falla con error de validación y `responsibleId` no se modifica

#### Scenario: Responsable puede coincidir con autor
- **WHEN** un admin asigna como responsable al mismo usuario que es `authorId`
- **THEN** la operación se persiste y `responsibleId = authorId`

### Requirement: Modelo de equipo de apoyo (assignees)

El sistema SHALL exponer una relación N-a-N entre `task` y `user` mediante la tabla `task_assignee (taskId, userId)` con PK compuesta `(taskId, userId)` y `ON DELETE CASCADE` en ambas FKs. Cada `assignee` SHALL apuntar a un usuario que sea `member` (de cualquier rol) de la `organizationId` de la tarea al momento de la asignación. La invariante de pertenencia a la organización SHALL validarse en la server action.

#### Scenario: Tarea sin assignees
- **WHEN** un admin crea una tarea sin agregar assignees
- **THEN** la tarea existe con cero filas en `task_assignee`

#### Scenario: Múltiples assignees
- **WHEN** un admin agrega varios assignees a una tarea
- **THEN** se persiste una fila por (taskId, userId) en `task_assignee`

#### Scenario: Assignee duplicado idempotente
- **WHEN** un admin intenta agregar como assignee a un usuario que ya es assignee de la misma tarea
- **THEN** la operación NO falla y NO crea fila duplicada (la PK compuesta protege; la action retorna éxito idempotente)

#### Scenario: Assignee debe ser member de la org
- **WHEN** un admin intenta agregar como assignee a un usuario que NO es member de la organización de la tarea
- **THEN** la operación falla con error de validación y nada se persiste

#### Scenario: Eliminar tarea elimina assignees en cascada
- **WHEN** se elimina una tarea (vía `deleteTask` en draft)
- **THEN** todas las filas de `task_assignee` con ese `taskId` se eliminan automáticamente

#### Scenario: Eliminar usuario elimina su rol de assignee en cascada
- **WHEN** se elimina un `user` referenciado como assignee en una o más tareas
- **THEN** las filas correspondientes en `task_assignee` se eliminan automáticamente

### Requirement: Disyunción responsable / assignees

El sistema SHALL garantizar que el `responsibleId` de una tarea NO coincida con ninguno de sus `assignees`. La invariante SHALL aplicarse en las server actions de gestión de equipo: agregar un assignee que ya es responsable falla con error; cambiar el responsable a un usuario que ya es assignee remueve automáticamente la fila correspondiente en `task_assignee` ANTES de actualizar `responsibleId`.

#### Scenario: Agregar assignee bloqueado por ser responsable
- **WHEN** un admin intenta agregar como assignee a un usuario que es el `responsibleId` de la tarea
- **THEN** la operación falla con error de validación indicando que ese usuario ya es responsable

#### Scenario: Cambiar responsable a un assignee existente
- **WHEN** un admin asigna como `responsibleId` a un usuario que actualmente está en `task_assignee` de esa tarea
- **THEN** la fila correspondiente en `task_assignee` se elimina y el `responsibleId` se actualiza al nuevo valor en la misma operación

### Requirement: Gestión de responsable

El sistema SHALL exponer acciones `setResponsible` y `clearResponsible`. `setResponsible(taskId, userId)` SHALL asignar `userId` como responsable de la tarea; falla si `userId` no es member de la org. `clearResponsible(taskId)` SHALL setear `responsibleId = NULL`. Ambas SHALL ser invocables por el `authorId` de la tarea O por cualquier `admin`/`owner` de su organización. Si la tarea tiene `visibility = 'active'` y se invoca `clearResponsible`, la operación SHALL fallar con error de validación (una tarea active no puede quedar sin responsable).

#### Scenario: Admin asigna responsable
- **WHEN** un admin invoca `setResponsible` con un member de la org como userId
- **THEN** `responsibleId` queda con ese valor y `updatedAt` se refresca

#### Scenario: Autor (no admin) asigna responsable a su draft
- **WHEN** el `authorId` (que es member regular) invoca `setResponsible` sobre su tarea en `draft` apuntando a otro member de la org
- **THEN** `responsibleId` se actualiza

#### Scenario: Cambiar responsable
- **WHEN** un admin invoca `setResponsible` sobre una tarea que ya tenía un responsable distinto
- **THEN** `responsibleId` se reemplaza por el nuevo valor

#### Scenario: Limpiar responsable de draft
- **WHEN** un admin invoca `clearResponsible` sobre una tarea con `visibility = "draft"`
- **THEN** `responsibleId` queda en `NULL`

#### Scenario: No se puede limpiar responsable de tarea active
- **WHEN** cualquier invocador autorizado invoca `clearResponsible` sobre una tarea con `visibility = "active"`
- **THEN** la operación falla con error de validación y `responsibleId` permanece inalterado

#### Scenario: Member no autorizado no puede asignar responsable
- **WHEN** un `member` regular que no es el `authorId` ni admin/owner invoca `setResponsible` o `clearResponsible`
- **THEN** la operación falla con error de autorización

### Requirement: Gestión de assignees

El sistema SHALL exponer acciones `addAssignee` y `removeAssignee`. `addAssignee(taskId, userId)` SHALL insertar una fila en `task_assignee`; falla si `userId` no es member de la org de la tarea o si ese `userId` ya es el `responsibleId`. `removeAssignee(taskId, userId)` SHALL eliminar la fila correspondiente; SHALL ser idempotente si la fila no existe. Ambas SHALL ser invocables por el `authorId` de la tarea O por cualquier `admin`/`owner` de su organización.

#### Scenario: Admin agrega assignee
- **WHEN** un admin invoca `addAssignee` con un member válido
- **THEN** se persiste una fila `(taskId, userId)` en `task_assignee`

#### Scenario: Admin quita assignee
- **WHEN** un admin invoca `removeAssignee` con un `userId` que actualmente es assignee de la tarea
- **THEN** la fila correspondiente se elimina

#### Scenario: removeAssignee idempotente
- **WHEN** un admin invoca `removeAssignee` con un `userId` que NO es assignee de la tarea
- **THEN** la operación retorna éxito sin cambios

#### Scenario: Member no autorizado no puede gestionar assignees
- **WHEN** un `member` regular que no es el `authorId` ni admin/owner invoca `addAssignee` o `removeAssignee`
- **THEN** la operación falla con error de autorización

### Requirement: Visibilidad de tareas según rol

El sistema SHALL determinar qué tareas puede LEER un usuario según su rol en la `activeOrganizationId`:
- Si el invocador es `admin` u `owner` de la organización: SHALL ver todas las tareas de la organización, sin restricción de visibility ni de participación.
- Si el invocador es `member` regular: SHALL ver una tarea si y solo si TODAS las siguientes condiciones se cumplen:
  1. La tarea tiene `visibility = 'active'`, Y
  2. El invocador es el `authorId`, O es el `responsibleId`, O existe una fila `(taskId, userId)` en `task_assignee` con `userId = invocador.id`.

Tareas con `visibility = 'draft'` SHALL ser invisibles a cualquier `member` regular. Tareas con `visibility = 'archived'` SHALL ser invisibles a cualquier `member` regular incluso si participó previamente.

#### Scenario: Admin ve todas las tareas de su org
- **WHEN** un admin solicita el listado o el detalle de cualquier tarea de su organización
- **THEN** la tarea es visible independientemente de su `visibility` y de si participa o no

#### Scenario: Member ve tarea active donde es responsable
- **WHEN** un `member` con `responsibleId = me` consulta esa tarea o el listado
- **THEN** la tarea es visible

#### Scenario: Member ve tarea active donde es assignee
- **WHEN** un `member` que existe en `task_assignee` de una tarea con `visibility = "active"` consulta esa tarea o el listado
- **THEN** la tarea es visible

#### Scenario: Member ve tarea active donde es autor
- **WHEN** un `member` que es `authorId` de una tarea con `visibility = "active"` consulta esa tarea o el listado
- **THEN** la tarea es visible

#### Scenario: Member NO ve tarea draft donde participa
- **WHEN** un `member` que es responsable o assignee de una tarea con `visibility = "draft"` consulta esa tarea
- **THEN** la tarea NO es visible (404 o resultado vacío en listado)

#### Scenario: Member NO ve tarea archived donde participó
- **WHEN** un `member` que es responsable o assignee de una tarea con `visibility = "archived"` consulta esa tarea
- **THEN** la tarea NO es visible

#### Scenario: Member NO ve tareas donde no participa
- **WHEN** un `member` consulta el listado y no es `authorId`, `responsibleId` ni assignee en ninguna tarea
- **THEN** el listado retorna vacío

### Requirement: Ruta `/tasks` para vista de participación

El sistema SHALL exponer una ruta `/tasks` accesible a cualquier usuario con `activeOrganizationId` (incluye `admin`, `owner` y `member`). La ruta SHALL renderizar el listado de tareas según las reglas de visibilidad por rol del requirement "Visibilidad de tareas según rol": admins ven todas las tareas activas, members ven solo aquellas en `active` donde son author/responsible/assignee. La vista SHALL ser de SOLO LECTURA: no expone botones de edición, transición, asignación ni borrado. La presentación SHALL reutilizar los componentes de listado y detalle usados por `/admin/tasks`, parametrizados con `capabilities` desactivadas para acciones de escritura. Todo el copy SHALL estar en español neutral en segunda persona singular `tú`.

#### Scenario: Admin accede a /tasks
- **WHEN** un admin u owner navega a `/tasks`
- **THEN** se renderiza el listado de tareas active de su organización, en modo solo lectura

#### Scenario: Member accede a /tasks
- **WHEN** un `member` regular navega a `/tasks`
- **THEN** se renderiza el listado con las tareas active donde es author/responsible/assignee

#### Scenario: Usuario sin organización activa
- **WHEN** un usuario autenticado sin `activeOrganizationId` navega a `/tasks`
- **THEN** es redirigido o ve un mensaje indicando que debe seleccionar una organización

#### Scenario: Ausencia de acciones de escritura
- **WHEN** se inspecciona la UI renderizada en `/tasks`
- **THEN** no aparecen controles para editar, transicionar, asignar, borrar ni tomar posesión, independientemente del rol del viewer

#### Scenario: Copy en español neutral
- **WHEN** se inspecciona el copy visible en `/tasks`
- **THEN** todas las cadenas usan formas neutras (`tú`, "Consulta", "Selecciona") y NO contienen voseo (`vos`, `Ingresá`, `Seleccioná`)

### Requirement: Gestión de equipo en `/admin/tasks`

El sistema SHALL extender la UI existente en `/admin/tasks` con controles para: (a) asignar o cambiar `responsibleId` de una tarea, (b) limpiar `responsibleId` (solo si la tarea no está `active`), (c) agregar uno o más assignees, (d) remover assignees, (e) eliminar la tarea (solo si está en `draft`). Los selectores de usuario SHALL listar únicamente `member`s de la `activeOrganizationId` y SHALL excluir, según corresponda, al usuario que ya ocupa el otro rol (no permitir seleccionar como assignee al usuario que ya es responsible, ni viceversa, salvo el swap explícito que reemplaza). Todo el copy en español neutral.

#### Scenario: Selector de responsable lista members de la org
- **WHEN** un admin abre el selector de responsable de una tarea
- **THEN** el selector lista todos los `member`s (rol indistinto) de la organización activa y no incluye usuarios externos

#### Scenario: Selector de assignees excluye al responsable
- **WHEN** un admin abre el selector para agregar assignees a una tarea con `responsibleId = X`
- **THEN** el selector no permite seleccionar al usuario X

#### Scenario: Botón eliminar solo en draft
- **WHEN** un admin consulta el detalle de una tarea con `visibility = "draft"`
- **THEN** se muestra un botón "Eliminar" que invoca `deleteTask`

#### Scenario: Botón eliminar oculto fuera de draft
- **WHEN** un admin consulta el detalle de una tarea con `visibility = "active"` o `"archived"`
- **THEN** no se muestra botón "Eliminar"
