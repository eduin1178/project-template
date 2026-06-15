## MODIFIED Requirements

### Requirement: Ruta `/tasks` para vista de participación
El sistema SHALL exponer una ruta `/tasks` accesible a cualquier usuario con organización activa (incluye `admin`, `owner` y `member`). La ruta SHALL renderizar el listado de tareas según las reglas de visibilidad por rol del requirement `Visibilidad de tareas según rol`: admins/owners pueden ver las tareas de la organización según filtros aplicables; members regulares ven solo tareas `active` donde son author/responsible/assignee.

La presentación SHALL usar los modos visuales definidos en `task-board-view`: tablero por estado y vista de tarjetas sin columnas. La ruta SHALL reutilizar los mismos componentes presentacionales que `/admin/tasks` cuando sea posible y SHALL honrar el comportamiento responsive: tablero con columnas en desktop y columnas apiladas en mobile; tarjetas en grilla responsive desktop y una columna mobile.

Cuando `/tasks` se renderice sin search param `status`, el listado SHALL NO aplicar filtro de estado por defecto. En modo `board`, esto SHALL mostrar todas las columnas de estado. Si la URL incluye un filtro `status` explícito, el sistema MAY honrarlo para compatibilidad con enlaces existentes.

Las acciones visibles al abrir el detalle dedicado de una tarea SHALL renderizarse condicionalmente según las capabilities del viewer:

- Acciones de transición de `status` (Iniciar, Marcar como hecha, Reabrir) SHALL ser visibles para `admin`/`owner`, para el `authorId`, para el `responsibleId` y para cualquier usuario presente en `task_assignee` de la tarea, siempre que `canChangeStatus` sea true.
- Acciones de transición de `visibility`, gestión de equipo, edición de contenido y borrado SHALL ser visibles SOLO cuando las capabilities existentes lo permitan.
- La acción `Tomar posesión` SHALL respetar el contrato existente de visibilidad por rol y autoría.

Los controles directos del listado en `/tasks` SHALL exponer solo filtros aplicables al viewer. Para `member` regular, el filtro de `visibility` NO SHALL renderizarse como control editable porque el listado efectivo está fijado a tareas `active` visibles. Para admin/owner, el sistema MAY exponer el dropdown multiselect de `visibility` si la ruta se usa como vista operativa de toda la organización. El `CreateTaskDialog` NO SHALL renderizarse en `/tasks`; la creación de tareas vive en `/admin/tasks`.

La selección de una tarea SHALL representarse mediante el segmento de URL `/tasks/[taskId]`. El query param `?taskId=<id>` deja de soportarse como mecanismo de navegación; las URLs legacy con `?taskId=` SHALL redirigir 308 a la ruta canónica equivalente según las reglas del requirement `Ruta dedicada para detalle de tarea` en `tasks-core`.

Todo el copy SHALL estar en español neutral en segunda persona singular `tú`, sin voseo.

#### Scenario: Admin accede a /tasks con listado visual
- **WHEN** un admin u owner navega a `/tasks`
- **THEN** se renderiza el listado visual con modos `board` y `cards`, y las tareas visibles respetan sus permisos y filtros aplicables

#### Scenario: Member accede a /tasks con listado visual
- **WHEN** un `member` regular navega a `/tasks`
- **THEN** se renderiza el mismo patrón visual con las tareas active donde es author/responsible/assignee

#### Scenario: Member sin status explícito ve tablero completo de sus tareas visibles
- **WHEN** un `member` regular navega a `/tasks` sin search param `status`
- **THEN** la consulta no filtra por estado y el board muestra las columnas `Pendiente`, `En curso` y `Hecha`

#### Scenario: Member no ve filtro editable de visibility
- **WHEN** un `member` regular abre `/tasks`
- **THEN** los controles directos no muestran opciones editables para `draft` ni `archived`

#### Scenario: Member ve acciones de status sobre tarea donde es responsable
- **WHEN** un `member` que es `responsibleId` de una tarea selecciona esa tarea en `/tasks/<id>` y `canChangeStatus = true`
- **THEN** el detalle muestra controles para transicionar `status` según el estado actual

#### Scenario: Member ve acciones de status sobre tarea donde es assignee
- **WHEN** un `member` que existe en `task_assignee` de una tarea selecciona esa tarea en `/tasks/<id>` y `canChangeStatus = true`
- **THEN** el detalle muestra controles para transicionar `status`

#### Scenario: Member NO ve acciones de edición ni de gestión de equipo
- **WHEN** un `member` regular no admin y no autor abre el detalle de una tarea donde participa como responsable o assignee
- **THEN** el detalle NO muestra botones para editar título/descripción/plazo, gestionar responsable/assignees, archivar, borrar ni tomar posesión si las capabilities no lo permiten

#### Scenario: Member que es autor ve acciones de su autoría
- **WHEN** un `member` que es `authorId` abre el detalle de su propia tarea active
- **THEN** el detalle muestra controles permitidos por sus capabilities y NO muestra controles no autorizados por estar la tarea active

#### Scenario: Admin en /tasks ve acciones admin
- **WHEN** un admin u owner abre el detalle de una tarea en `/tasks/<id>`
- **THEN** el detalle muestra las acciones admin permitidas por sus capabilities

#### Scenario: /tasks no muestra creación de tarea
- **WHEN** cualquier usuario navega a `/tasks`
- **THEN** la UI no renderiza `CreateTaskDialog`
