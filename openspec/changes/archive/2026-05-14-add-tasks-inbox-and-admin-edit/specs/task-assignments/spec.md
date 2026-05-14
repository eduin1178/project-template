## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Navegación a `/tasks` desde el sidebar del rol member

El sistema SHALL exponer en el sidebar del shell `/app` (definido en `components/layout/contexts/app.ts`) un ítem de navegación con label "Tareas" que enlaza a `/tasks`. El ítem SHALL aparecer junto al ítem "Inicio" existente, usar un icono consistente con el sidebar admin (`ListChecksIcon` de `@phosphor-icons/react`), y SHALL ser visible para cualquier usuario que aterrice en `/app` (es decir, usuarios autenticados con membresía no-admin en alguna organización).

#### Scenario: Member ve item Tareas en el sidebar
- **WHEN** un `member` regular abre cualquier ruta dentro de `/app`
- **THEN** el sidebar muestra un ítem "Tareas" que apunta a `/tasks`

#### Scenario: Click navega a /tasks
- **WHEN** el `member` hace click en el ítem "Tareas" del sidebar
- **THEN** el navegador navega a `/tasks` y se renderiza el shell de bandeja
