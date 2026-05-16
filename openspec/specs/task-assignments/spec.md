# task-assignments Specification

## Purpose

Modelo de responsable y equipo de apoyo (assignees) para tareas, con reglas de visibilidad por rol que permiten a `member`s leer las tareas en las que participan. Define las acciones de gestión de equipo (asignar/limpiar responsable, agregar/quitar assignees), las invariantes de pertenencia a la organización y disyunción responsable/assignees, y la ruta `/tasks` de lectura para cualquier rol con `activeOrganizationId`.

## Requirements

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

El sistema SHALL exponer una ruta `/tasks` accesible a cualquier usuario con `activeOrganizationId` (incluye `admin`, `owner` y `member`). La ruta SHALL renderizar el listado de tareas según las reglas de visibilidad por rol del requirement "Visibilidad de tareas según rol": admins ven todas las tareas activas, members ven solo aquellas en `active` donde son author/responsible/assignee.

La presentación SHALL usar el MISMO shell tipo bandeja de entrada que `/admin/tasks` (filtros + lista + detalle), reutilizando los mismos componentes presentacionales y honrando el comportamiento responsivo definido en `tasks-core` (lista y detalle lado a lado en desktop; una sola sección a la vez en mobile; filtros en `Sheet` mobile, columna lateral en desktop). Las acciones visibles en el detalle SHALL renderizarse condicionalmente según las capabilities del viewer:

- Acciones de transición de `status` (Iniciar, Marcar como hecha, Reabrir) SHALL ser visibles para `admin`/`owner`, para el `authorId`, para el `responsibleId` y para cualquier usuario presente en `task_assignee` de la tarea.
- Acciones de transición de `visibility` (Activar, Archivar, Reactivar), de gestión de equipo (responsable y assignees), de edición de contenido y de borrado SHALL ser visibles SÓLO para `admin`/`owner` y, según las reglas ya definidas en `tasks-core`, para el `authorId` cuando corresponda (edición en draft, borrado en draft).
- La acción "Tomar posesión" SHALL ser visible para `admin`/`owner` distintos del autor y para `responsibleId`/assignees distintos del autor.

El panel de filtros del shell en `/tasks` SHALL exponer SÓLO el filtro por `status`; NO SHALL exponer filtro por `visibility` (porque para member el listado está fijado a `active` y para admin esta ruta es una vista de participación). El `CreateTaskDialog` NO SHALL renderizarse en `/tasks`; la creación de tareas vive en `/admin/tasks`.

La selección de una tarea SHALL representarse mediante el segmento de URL `/tasks/[taskId]` (definido en `tasks-core`). El query param `?taskId=<id>` deja de soportarse como mecanismo de navegación; las URLs legacy con `?taskId=` SHALL redirigir 308 a la ruta canónica equivalente según las reglas del requirement "Ruta dedicada para detalle de tarea" en `tasks-core`.

Todo el copy SHALL estar en español neutral en segunda persona singular `tú`, sin voseo.

#### Scenario: Admin accede a /tasks con shell de bandeja
- **WHEN** un admin u owner navega a `/tasks`
- **THEN** se renderiza el shell (filtros por status + lista + detalle) y la lista contiene las tareas active de su organización

#### Scenario: Member accede a /tasks con shell de bandeja
- **WHEN** un `member` regular navega a `/tasks`
- **THEN** se renderiza el mismo shell que ve el admin, con las tareas active donde es author/responsible/assignee

#### Scenario: Member ve acciones de status sobre tarea donde es responsable
- **WHEN** un `member` que es `responsibleId` de una tarea selecciona esa tarea en `/tasks`
- **THEN** el detail pane muestra controles para transicionar `status` (según el estado actual: Iniciar, Marcar como hecha o Reabrir)

#### Scenario: Member ve acciones de status sobre tarea donde es assignee
- **WHEN** un `member` que existe en `task_assignee` de una tarea selecciona esa tarea en `/tasks`
- **THEN** el detail pane muestra controles para transicionar `status`

#### Scenario: Member NO ve acciones de edición ni de gestión de equipo
- **WHEN** un `member` regular (no admin, no autor) selecciona una tarea en `/tasks` donde participa como responsable o assignee
- **THEN** el detail pane NO muestra botones para editar título/descripción/plazo, ni para gestionar responsable/assignees, ni para archivar/borrar/tomar posesión

#### Scenario: Member que es autor ve acciones de su autoría
- **WHEN** un `member` que es `authorId` selecciona su propia tarea en `/tasks` y la tarea está en `active`
- **THEN** el detail pane muestra los controles de transición de `status`, y NO muestra controles de edición de contenido (porque la tarea NO está en draft) ni de borrado (porque la tarea NO está en draft)

#### Scenario: Admin en /tasks ve todas las acciones admin
- **WHEN** un admin u owner selecciona una tarea en `/tasks`
- **THEN** el detail pane muestra los mismos controles que vería en `/admin/tasks` (transiciones, edición, gestión de equipo, borrado en draft)

#### Scenario: Panel de filtros oculta visibility
- **WHEN** cualquier usuario abre `/tasks`
- **THEN** el panel de filtros muestra opciones para `status` y NO muestra opciones para `visibility`

#### Scenario: No se renderiza CreateTaskDialog en /tasks
- **WHEN** un admin abre `/tasks`
- **THEN** la cabecera de la columna de lista NO muestra el botón "Nueva tarea"

#### Scenario: Selección por segmento de URL
- **WHEN** un usuario navega a `/tasks/<id>`
- **THEN** el detail pane se abre con la tarea cuyo id coincide, siempre que el viewer tenga permiso de visibilidad sobre ella

#### Scenario: Redirect de query param legacy
- **WHEN** un usuario navega a `/tasks?taskId=<id>`
- **THEN** el servidor responde 308 redirigiendo a `/tasks/<id>`, preservando los demás searchParams

#### Scenario: Usuario sin organización activa
- **WHEN** un usuario autenticado sin `activeOrganizationId` navega a `/tasks`
- **THEN** es redirigido o ve un mensaje indicando que debe seleccionar una organización

#### Scenario: Copy en español neutral
- **WHEN** se inspecciona el copy visible en `/tasks`
- **THEN** todas las cadenas usan formas neutras (`tú`, "Consulta", "Selecciona") y NO contienen voseo (`vos`, `Ingresá`, `Seleccioná`)

### Requirement: Navegación a `/tasks` desde el sidebar del rol member

El sistema SHALL exponer en el sidebar del shell `/app` (definido en `components/layout/contexts/app.ts`) un ítem de navegación con label "Tareas" que enlaza a `/tasks`. El ítem SHALL aparecer junto al ítem "Inicio" existente, usar un icono consistente con el sidebar admin (`ListChecksIcon` de `@phosphor-icons/react`), y SHALL ser visible para cualquier usuario que aterrice en `/app` (es decir, usuarios autenticados con membresía no-admin en alguna organización).

#### Scenario: Member ve item Tareas en el sidebar
- **WHEN** un `member` regular abre cualquier ruta dentro de `/app`
- **THEN** el sidebar muestra un ítem "Tareas" que apunta a `/tasks`

#### Scenario: Click navega a /tasks
- **WHEN** el `member` hace click en el ítem "Tareas" del sidebar
- **THEN** el navegador navega a `/tasks` y se renderiza el shell de bandeja

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

### Requirement: Contrato `TaskCapabilities` extendido con `canComment`

El sistema SHALL extender el contrato `TaskCapabilities` (introducido en `add-tasks-inbox-and-admin-edit`) con un nuevo campo booleano `canComment` que las rutas `/admin/tasks` y `/tasks` calculan server-side por cada tarea visible. `canComment` SHALL ser true si y solo si el viewer cumple la misma regla de visibilidad de la tarea: `admin`/`owner` siempre; `member` solo si la tarea está en `visibility = 'active'` Y el viewer es autor, responsable o assignee de la tarea.

El detail pane SHALL usar `canComment` para mostrar u ocultar el composer del panel de comentarios. La autorización final vive en la server action `createComment`; `canComment` es una proyección server-side que evita renderizar el composer cuando la acción fallaría.

#### Scenario: Admin tiene canComment = true en cualquier visibility
- **WHEN** un admin u owner abre el detalle de una tarea de su organización (cualquier visibility)
- **THEN** la tarea llega con `capabilities.canComment = true`

#### Scenario: Member responsable de tarea active tiene canComment = true
- **WHEN** un `member` con `responsibleId = me` abre el detalle de una tarea con `visibility = "active"`
- **THEN** la tarea llega con `capabilities.canComment = true`

#### Scenario: Member assignee de tarea active tiene canComment = true
- **WHEN** un `member` presente en `task_assignee` abre el detalle de una tarea con `visibility = "active"`
- **THEN** la tarea llega con `capabilities.canComment = true`

#### Scenario: Member autor de tarea active tiene canComment = true
- **WHEN** un `member` que es `authorId` abre el detalle de su tarea con `visibility = "active"`
- **THEN** la tarea llega con `capabilities.canComment = true`

#### Scenario: Member NO admin sobre tarea draft tiene canComment irrelevante
- **WHEN** un `member` regular no tiene visibilidad sobre una tarea `draft`
- **THEN** la tarea ni siquiera llega al detail pane del member; no se evalúa `canComment` (regla de visibilidad ya filtra)

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

### Requirement: Foto de usuario en presentación de equipo

El sistema SHALL renderizar la foto real del usuario (campo `user.image` del schema de auth) en cada lugar de la UI que muestre el avatar de un participante de tareas: avatar del autor en el header del detalle, avatares de responsable y equipo de apoyo en el header del detalle, avatares en la lista del modal de gestión de equipo, y avatares en el panel de comentarios donde se muestren autores.

Cuando `user.image` esté presente y sea no-vacío, el `<Avatar>` SHALL renderizar `<AvatarImage src={user.image} />` además del `<AvatarFallback>` con iniciales. Cuando `user.image` sea `NULL` o vacío, el avatar SHALL renderizarse solo con iniciales (comportamiento actual). El `<AvatarFallback>` SHALL preservarse en todos los casos para cubrir el periodo de carga de la imagen y los errores de red.

Las queries que alimentan estas vistas SHALL exponer el campo `image` para todos los usuarios involucrados:

- `TaskListItem` SHALL incluir `authorImage: string | null` y `responsibleImage: string | null`.
- `TaskAssigneeItem` SHALL incluir `image: string | null`.
- `OrgMemberOption` (retorno de `listOrgMembers`) SHALL incluir `image: string | null`.
- El `SELECT` de tareas (`TASK_SELECT_SHAPE`) y la query de assignees en `attachAssignees` SHALL traer `user.image` con `LEFT JOIN` sobre la tabla `user`.

#### Scenario: Avatar del autor con foto en el detalle
- **WHEN** un usuario abre el detalle de una tarea cuyo `authorId` apunta a un usuario con `image` definido
- **THEN** el avatar del autor en el header se renderiza con la foto, con iniciales como fallback

#### Scenario: Avatar del responsable con foto en el header
- **WHEN** un usuario abre el detalle de una tarea cuyo responsable tiene `image` definido
- **THEN** el avatar del responsable en el cluster del header se renderiza con la foto

#### Scenario: Avatares de assignees con foto en el header
- **WHEN** un usuario abre el detalle de una tarea con assignees que tienen `image` definido
- **THEN** los avatares de cada assignee visible se renderizan con su foto

#### Scenario: Avatar sin imagen muestra iniciales
- **WHEN** un usuario tiene `image = NULL` o vacío
- **THEN** el avatar correspondiente se renderiza solo con iniciales (sin elemento `<img>` roto)

#### Scenario: Avatares con foto en el modal de equipo
- **WHEN** un admin abre el modal "Equipo de la tarea" sobre una tarea con assignees con `image`
- **THEN** la lista de assignees muestra cada avatar con su foto, con iniciales como fallback

#### Scenario: Avatares con foto en comentarios
- **WHEN** un usuario abre el panel de comentarios y los autores de comentarios tienen `image`
- **THEN** cada avatar de comentarista se renderiza con su foto

### Requirement: Email visible para diferenciar usuarios homónimos

El sistema SHALL mostrar el email de cada usuario en los lugares donde el usuario debe distinguirse para tomar una decisión: la lista de assignees del modal de gestión de equipo, el `Select` de "Responsable" del modal, y el `Select` de "Agregar al equipo de apoyo" del modal.

- En la **lista de assignees** del modal, cada fila SHALL mostrar el nombre del usuario y, debajo del nombre, su email en una segunda línea con tipografía secundaria (más pequeña y de menor contraste). Si el usuario no tiene `name`, la primera línea SHALL mostrar el email y la segunda no SHALL renderizarse.
- En los **`<Select>` de responsable y de agregar assignee**, cada `<SelectItem>` SHALL renderizarse como un item de dos líneas: nombre arriba (línea principal) y email debajo (línea secundaria con tipografía y color de menor jerarquía). Si el usuario no tiene `name`, el item SHALL mostrar solo el email en la línea principal.
- El `<SelectValue>` (placeholder cuando hay selección) SHALL seguir mostrando solo el nombre del usuario para no romper el layout del trigger; la diferenciación por email se da al ABRIR el dropdown.

Esta ampliación NO SHALL afectar tooltips ni etiquetas en el header del detalle, donde el espacio es limitado y la diferenciación primaria es visual (foto + tooltip con nombre y rol).

#### Scenario: Lista del modal muestra email debajo del nombre
- **WHEN** un admin abre el modal "Equipo de la tarea" con dos assignees que comparten nombre pero tienen emails distintos
- **THEN** cada assignee se renderiza como nombre arriba y email debajo, permitiendo distinguirlos

#### Scenario: Assignee sin nombre muestra solo email
- **WHEN** un assignee tiene `name = NULL` o vacío
- **THEN** la primera línea del item muestra el email y no se renderiza una segunda línea redundante

#### Scenario: Select de responsable muestra items de dos líneas
- **WHEN** un admin abre el `<Select>` de responsable
- **THEN** cada opción se renderiza con nombre en la línea principal y email en una línea secundaria de menor jerarquía visual

#### Scenario: Select de agregar assignee muestra items de dos líneas
- **WHEN** un admin abre el `<Select>` de "Agregar al equipo de apoyo"
- **THEN** cada opción se renderiza con nombre y email en dos líneas

#### Scenario: SelectValue del trigger muestra solo nombre
- **WHEN** un admin selecciona un responsable y luego inspecciona el trigger del `<Select>` cerrado
- **THEN** el trigger muestra únicamente el nombre del usuario seleccionado (sin email para preservar el alto del control)

#### Scenario: Copy en español neutral
- **WHEN** se inspecciona cualquier copy nuevo introducido por esta presentación
- **THEN** todas las cadenas usan formas neutras (`tú`, "Selecciona", "Agrega") y NO contienen voseo
