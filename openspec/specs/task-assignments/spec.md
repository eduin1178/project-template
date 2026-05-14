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

La presentación SHALL usar el MISMO shell tipo bandeja de entrada que `/admin/tasks` (tres paneles: filtros | lista | detalle), reutilizando los mismos componentes presentacionales. Las acciones visibles en el detalle SHALL renderizarse condicionalmente según las capabilities del viewer:

- Acciones de transición de `status` (Iniciar, Marcar como hecha, Reabrir) SHALL ser visibles para `admin`/`owner`, para el `authorId`, para el `responsibleId` y para cualquier usuario presente en `task_assignee` de la tarea.
- Acciones de transición de `visibility` (Activar, Archivar, Reactivar), de gestión de equipo (responsable y assignees), de edición de contenido y de borrado SHALL ser visibles SÓLO para `admin`/`owner` y, según las reglas ya definidas en `tasks-core`, para el `authorId` cuando corresponda (edición en draft, borrado en draft).
- La acción "Tomar posesión" SHALL ser visible para `admin`/`owner` distintos del autor y para `responsibleId`/assignees distintos del autor.

El panel de filtros del shell en `/tasks` SHALL exponer SÓLO el filtro por `status`; NO SHALL exponer filtro por `visibility` (porque para member el listado está fijado a `active` y para admin esta ruta es una vista de participación). El `CreateTaskDialog` NO SHALL renderizarse en `/tasks`; la creación de tareas vive en `/admin/tasks`.

La selección de tarea SHALL usar el parámetro `?taskId=<id>` en lugar de una subruta. La ruta `/tasks/[taskId]` SHALL redirigir con HTTP 308 a `/tasks?taskId=<id>` para preservar deep-links existentes.

Todo el copy SHALL estar en español neutral en segunda persona singular `tú`, sin voseo.

#### Scenario: Admin accede a /tasks con shell de bandeja
- **WHEN** un admin u owner navega a `/tasks`
- **THEN** se renderiza el shell de tres paneles (filtros por status | lista | detalle) y la lista contiene las tareas active de su organización

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

#### Scenario: Selección por searchParam
- **WHEN** un usuario navega a `/tasks?taskId=<id>`
- **THEN** el detail pane se abre con la tarea cuyo id coincide, siempre que el viewer tenga permiso de visibilidad sobre ella

#### Scenario: Redirect de subruta legacy
- **WHEN** un usuario navega a `/tasks/<id>`
- **THEN** el servidor responde 308 redirigiendo a `/tasks?taskId=<id>`

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
