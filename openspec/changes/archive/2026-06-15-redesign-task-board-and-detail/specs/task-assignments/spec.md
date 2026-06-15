## MODIFIED Requirements

### Requirement: Ruta `/tasks` para vista de participación
El sistema SHALL exponer una ruta `/tasks` accesible a cualquier usuario con organización activa (incluye `admin`, `owner` y `member`). La ruta SHALL renderizar el listado de tareas según las reglas de visibilidad por rol del requirement `Visibilidad de tareas según rol`: admins/owners pueden ver las tareas de la organización según filtros aplicables; members regulares ven solo tareas `active` donde son author/responsible/assignee.

La presentación SHALL usar los modos visuales definidos en `task-board-view`: tablero por estado y vista de tarjetas sin columnas. La ruta SHALL reutilizar los mismos componentes presentacionales que `/admin/tasks` cuando sea posible y SHALL honrar el comportamiento responsive: tablero con columnas en desktop y columnas apiladas en mobile; tarjetas en grilla responsive desktop y una columna mobile.

Las acciones visibles al abrir el detalle dedicado de una tarea SHALL renderizarse condicionalmente según las capabilities del viewer:

- Acciones de transición de `status` (Iniciar, Marcar como hecha, Reabrir) SHALL ser visibles para `admin`/`owner`, para el `authorId`, para el `responsibleId` y para cualquier usuario presente en `task_assignee` de la tarea, siempre que `canChangeStatus` sea true.
- Acciones de transición de `visibility`, gestión de equipo, edición de contenido y borrado SHALL ser visibles SOLO cuando las capabilities existentes lo permitan.
- La acción `Tomar posesión` SHALL respetar el contrato existente de visibilidad por rol y autoría.

El panel de filtros del listado en `/tasks` SHALL exponer filtros aplicables al viewer. Para `member` regular, el filtro de `visibility` NO SHALL renderizarse como control editable porque el listado efectivo está fijado a tareas `active` visibles. Para admin/owner, el sistema MAY exponer el filtro de `visibility` si la ruta se usa como vista operativa de toda la organización. El `CreateTaskDialog` NO SHALL renderizarse en `/tasks`; la creación de tareas vive en `/admin/tasks`.

La selección de una tarea SHALL representarse mediante el segmento de URL `/tasks/[taskId]`. El query param `?taskId=<id>` deja de soportarse como mecanismo de navegación; las URLs legacy con `?taskId=` SHALL redirigir 308 a la ruta canónica equivalente según las reglas del requirement `Ruta dedicada para detalle de tarea` en `tasks-core`.

Todo el copy SHALL estar en español neutral en segunda persona singular `tú`, sin voseo.

#### Scenario: Admin accede a /tasks con listado visual
- **WHEN** un admin u owner navega a `/tasks`
- **THEN** se renderiza el listado visual con modos `board` y `cards`, y las tareas visibles respetan sus permisos y filtros aplicables

#### Scenario: Member accede a /tasks con listado visual
- **WHEN** un `member` regular navega a `/tasks`
- **THEN** se renderiza el mismo patrón visual con las tareas active donde es author/responsible/assignee

#### Scenario: Member no ve filtro editable de visibility
- **WHEN** un `member` regular abre `/tasks`
- **THEN** el panel de filtros no muestra opciones editables para `draft` ni `archived`

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
- **THEN** el detalle muestra los controles administrativos permitidos por `TaskCapabilities`

#### Scenario: No se renderiza CreateTaskDialog en /tasks
- **WHEN** un admin abre `/tasks`
- **THEN** la cabecera del listado NO muestra el botón `Nueva tarea`

#### Scenario: Selección por segmento de URL
- **WHEN** un usuario navega a `/tasks/<id>`
- **THEN** se abre la página de detalle dedicada con la tarea cuyo id coincide, siempre que el viewer tenga permiso de visibilidad sobre ella

#### Scenario: Redirect de query param legacy
- **WHEN** un usuario navega a `/tasks?taskId=<id>`
- **THEN** el servidor responde 308 redirigiendo a `/tasks/<id>`, preservando los demás searchParams

#### Scenario: Usuario sin organización activa
- **WHEN** un usuario autenticado sin organización activa navega a `/tasks`
- **THEN** es redirigido o ve un mensaje indicando que debe seleccionar una institución

#### Scenario: Copy en español neutral
- **WHEN** se inspecciona el copy visible en `/tasks`
- **THEN** todas las cadenas usan formas neutras (`tú`, `Consulta`, `Selecciona`) y NO contienen voseo (`vos`, `Ingresá`, `Seleccioná`)
