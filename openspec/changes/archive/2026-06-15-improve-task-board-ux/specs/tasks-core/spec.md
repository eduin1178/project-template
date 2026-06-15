## ADDED Requirements

### Requirement: Cambio de status desde drag-and-drop usa acción existente
El sistema SHALL tratar cualquier cambio de estado iniciado por drag-and-drop como una invocación de la server action existente `changeTaskStatus(taskId, newStatus, commentBody)`. Ningún componente de UI, endpoint alternativo ni acción nueva SHALL mutar `task.status` directamente como resultado de un drop.

El comentario, autorización, reglas de transición, bloqueo de `pending → done`, gate de vencimiento e inserción de comentario SHALL seguir rigiéndose por los requirements existentes de `changeTaskStatus` y sus capabilities relacionadas.

#### Scenario: Drag-and-drop no crea vía alternativa de mutación
- **WHEN** una card se suelta sobre una columna de estado diferente y el usuario confirma la justificación
- **THEN** la mutación real de `task.status` ocurre exclusivamente mediante `changeTaskStatus`

#### Scenario: Drag-and-drop respeta comentario obligatorio
- **WHEN** un usuario intenta confirmar un cambio de estado originado por drag-and-drop sin comentario válido
- **THEN** la operación falla y `task.status` permanece inalterado

## MODIFIED Requirements

### Requirement: UI mínima en `/admin` con copy en español neutral
El sistema SHALL exponer una sub-vista bajo `/admin/tasks` con: (a) listado de tareas de la organización con control directo para filtrar por `visibility` cuando aplique, (b) acción para crear una nueva tarea (form con `title`, `description`, `dueAt` opcional, `visibility` inicial), (c) edición y transiciones desde el detalle/fila, (d) acción "Tomar posesión" visible para admins/owners distintos del autor. Todo el copy de UI SHALL usar español neutral en segunda persona singular `tú` (ej. "Crea", "Selecciona", "Elige"); NO SHALL usar voseo ni otras formas regionales.

El listado admin SHALL NO aplicar filtro de `status` por defecto cuando la URL no incluya `status`. El tablero SHALL mostrar todas las columnas por estado en esa condición. Si la URL incluye un filtro `status` explícito, el sistema MAY honrarlo para compatibilidad con enlaces existentes, pero el control primario visible del listado SHALL ser el filtro de `visibility`.

#### Scenario: Acceso a /admin/tasks
- **WHEN** un admin u owner navega a `/admin/tasks`
- **THEN** se renderiza el listado con el control directo de `visibility` aplicable y la acción de crear

#### Scenario: Acceso denegado a member
- **WHEN** un `member` regular navega a `/admin/tasks`
- **THEN** se le redirige fuera del panel admin (consistente con el resto de rutas `/admin/*`)

#### Scenario: Admin sin status explícito ve todas las tareas
- **WHEN** un admin navega a `/admin/tasks` sin search param `status`
- **THEN** la consulta de listado no filtra por `status` y el tablero muestra todas las columnas

#### Scenario: Status explícito se conserva por compatibilidad
- **WHEN** un admin navega a `/admin/tasks?status=in_progress`
- **THEN** el listado puede limitarse a tareas en curso y el tablero muestra la columna correspondiente

#### Scenario: Copy en español neutral
- **WHEN** se inspecciona el copy visible en `/admin/tasks` (botones, labels, placeholders, mensajes de error)
- **THEN** todas las cadenas usan formas neutras (`tú`, "Crea", "Selecciona", "Elige", "Edita", "Cierra") y NO contienen voseo (`vos`, `Ingresá`, `Seleccioná`, `Eligí`, `Editá`)

### Requirement: Panel de filtros unificado
El sistema SHALL NO depender de un panel `Sheet` o modal como punto principal para filtrar tareas en `/tasks` ni en `/admin/tasks`. La barra superior del listado visual SHALL renderizar controles directos y compactos: un dropdown multiselect de `visibility` cuando sea aplicable y un dropdown único para elegir el modo de vista (`board` o `cards`).

El estado seleccionado de `visibility` SHALL reflejarse visualmente en el trigger del dropdown, por ejemplo mediante etiqueta resumida o conteo. El sistema SHALL preservar submit por interacción y persistencia en URL. El filtro de `visibility` SHALL mostrarse solo cuando sea aplicable según permisos efectivos del viewer.

#### Scenario: Desktop NO muestra Sheet de filtros
- **WHEN** un usuario en viewport ≥1024px abre `/tasks` o `/admin/tasks`
- **THEN** NO se renderiza un `Sheet` de filtros como punto principal; los controles directos aparecen en la barra superior del listado visual

#### Scenario: Mobile usa controles directos alcanzables
- **WHEN** un usuario en viewport <768px abre `/tasks` o `/admin/tasks`
- **THEN** los controles directos de visibilidad y vista son visibles o alcanzables desde la barra del listado y tienen tamaño táctil adecuado

#### Scenario: Visibilidad activa reflejada en dropdown
- **WHEN** un usuario aplica al menos un filtro de `visibility`
- **THEN** el trigger del dropdown de visibilidad refleja que hay selección activa

#### Scenario: Aplicar visibilidad actualiza URL
- **WHEN** un usuario selecciona o deselecciona una opción de `visibility`
- **THEN** la URL se actualiza con los searchParams correspondientes y la lista se refresca

#### Scenario: Copy en español neutral
- **WHEN** se inspecciona el copy de los controles directos
- **THEN** todas las cadenas usan formas neutras (`tú`, `Visibilidad`, `Vista`, `Tablero`, `Tarjetas`) y NO contienen voseo

### Requirement: Ruta dedicada para detalle de tarea
El sistema SHALL exponer la ruta `/tasks/[taskId]` y `/admin/tasks/[taskId]` como segmento de URL canónico para representar el detalle dedicado de una tarea seleccionada. Esta ruta reemplaza al mecanismo previo basado en query param `?taskId=<id>` y ya no renderiza una bandeja lista-detalle.

La selección de una tarea desde el listado visual SHALL navegar al segmento dinámico (`/tasks/<id>` o `/admin/tasks/<id>`), preservando los searchParams existentes, incluyendo filtros y modo de vista (`view=board|cards`). Volver al listado SHALL navegar a la ruta base correspondiente preservando los searchParams vigentes.

El control visual para volver al listado SHALL estar integrado dentro de la card principal/header del detalle full-page. Si se renderiza como botón compacto o solo icono, SHALL tener nombre accesible equivalente a `Volver al listado`.

El sistema NO SHALL leer el query param `?taskId=` como mecanismo de selección. Si una URL legacy con `?taskId=<id>` llega al servidor, el handler SHALL redirigir con HTTP 308 a la ruta canónica equivalente (`/tasks?taskId=X` → `/tasks/X`, `/admin/tasks?taskId=X` → `/admin/tasks/X`), preservando el resto de los searchParams.

#### Scenario: Click en tarjeta navega a /tasks/[taskId]
- **WHEN** un usuario hace click en una tarjeta de tarea en `/tasks` con filtros activos en la URL
- **THEN** el navegador navega a `/tasks/<id>` preservando los searchParams de filtros y modo de vista

#### Scenario: Click en tarjeta navega a /admin/tasks/[taskId]
- **WHEN** un admin hace click en una tarjeta en `/admin/tasks` con filtros activos
- **THEN** el navegador navega a `/admin/tasks/<id>` preservando los searchParams de filtros y modo de vista

#### Scenario: Deep-link a /tasks/[taskId] renderiza detalle full-page
- **WHEN** un usuario con visibilidad sobre la tarea navega directamente a `/tasks/<id>`
- **THEN** el detalle se renderiza server-side como página dedicada responsive

#### Scenario: Deep-link a tarea sin permiso
- **WHEN** un usuario sin visibilidad sobre la tarea navega directamente a `/tasks/<id>` o `/admin/tasks/<id>`
- **THEN** el sistema responde con 404 o equivalente sin filtrar la existencia de la tarea

#### Scenario: Redirect legacy de query param a ruta
- **WHEN** un usuario navega a `/tasks?taskId=<id>` o `/admin/tasks?taskId=<id>`
- **THEN** el servidor responde con HTTP 308 a `/tasks/<id>` o `/admin/tasks/<id>` respectivamente, preservando los demás searchParams

#### Scenario: Volver al listado preserva filtros y modo
- **WHEN** un usuario en `/tasks/<id>?view=cards&status=in_progress` invoca la acción de volver al listado
- **THEN** el navegador navega a `/tasks?view=cards&status=in_progress`

#### Scenario: Botón volver está dentro de la card principal
- **WHEN** un usuario abre `/tasks/<id>` o `/admin/tasks/<id>`
- **THEN** la acción para volver al listado aparece dentro del header/card principal del detalle con nombre accesible
