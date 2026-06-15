## ADDED Requirements

### Requirement: Drag-and-drop trazable en tablero
El sistema SHALL permitir arrastrar cards entre columnas de `status` únicamente en modo `board`. Soltar una card sobre una columna de estado diferente SHALL iniciar una intención de cambio de estado, pero NO SHALL mutar `task.status` silenciosamente. La UI SHALL abrir un diálogo de justificación que solicite `commentBody` y SHALL invocar la server action existente `changeTaskStatus(taskId, newStatus, commentBody)` al confirmar.

La UI SHALL rechazar o revertir visualmente movimientos inválidos conocidos antes de abrir el diálogo, incluyendo soltar en la misma columna y la transición directa `pending → done`. La server action SHALL seguir siendo la fuente de verdad para permisos, vencimiento, comentario obligatorio, transición permitida y rollback transaccional.

#### Scenario: Drop abre diálogo de justificación
- **WHEN** un usuario arrastra una card desde `pending` hacia la columna `in_progress`
- **THEN** la UI abre un diálogo solicitando justificación y NO cambia definitivamente el estado antes de confirmar

#### Scenario: Confirmar drop invoca action trazable
- **WHEN** el usuario confirma el diálogo con un comentario válido
- **THEN** el sistema invoca `changeTaskStatus(taskId, "in_progress", commentBody)` y refresca el tablero tras éxito

#### Scenario: Drop inválido pending a done se rechaza
- **WHEN** un usuario arrastra una card desde `pending` hacia la columna `done`
- **THEN** la UI rechaza la intención o revierte la card sin invocar cambio de estado

#### Scenario: Error server-side revierte la intención
- **WHEN** el usuario confirma un drop pero `changeTaskStatus` falla por autorización, vencimiento, comentario inválido o regla de transición
- **THEN** la tarea permanece en su estado anterior y la UI muestra feedback de error sin persistir cambios

#### Scenario: Modo cards no tiene drag-and-drop
- **WHEN** un usuario cambia a `view=cards`
- **THEN** las tarjetas no ofrecen drop targets para cambiar `status`

## MODIFIED Requirements

### Requirement: Modos visuales de listado de tareas
El sistema SHALL renderizar las rutas de listado de tareas mediante una experiencia visual con dos modos seleccionables: `board` y `cards`. El modo `board` SHALL agrupar tareas por `status` en columnas `Pendiente`, `En curso` y `Hecha`. El modo `cards` SHALL renderizar las mismas tareas como una grilla/lista de tarjetas sin columnas. Si el modo no está presente en la URL o tiene un valor inválido, el sistema SHALL usar `board` como default.

El control para elegir modo SHALL renderizarse como un único dropdown que comunique el modo actual y permita seleccionar `Tablero` o `Tarjetas`, preservando los filtros vigentes en la URL.

#### Scenario: Default a tablero por estado
- **WHEN** un usuario navega a `/tasks` o `/admin/tasks` sin search param de modo de vista
- **THEN** el listado se renderiza en modo `board` con columnas por estado

#### Scenario: Seleccionar tarjetas desde dropdown
- **WHEN** un usuario abre el dropdown de vista y selecciona `Tarjetas`
- **THEN** la URL se actualiza con `view=cards` y las tareas se renderizan como tarjetas sin columnas, preservando los filtros vigentes

#### Scenario: Seleccionar tablero desde dropdown
- **WHEN** un usuario está en `view=cards`, abre el dropdown de vista y selecciona `Tablero`
- **THEN** la URL se actualiza con `view=board` y las tareas se agrupan por estado

#### Scenario: Modo inválido usa default seguro
- **WHEN** un usuario navega con `view=calendar` o cualquier valor no soportado
- **THEN** el sistema renderiza modo `board` sin fallar

### Requirement: Columnas del tablero por estado
El sistema SHALL mostrar en modo `board` una columna por cada estado incluido en el filtro efectivo de `status`. Si no existe filtro efectivo de `status`, el tablero SHALL mostrar las columnas `Pendiente`, `En curso` y `Hecha`. Cada columna SHALL mostrar título, conteo de tareas visibles en esa columna y tarjetas ordenadas por el criterio default del listado. Si una columna no tiene tareas, SHALL mostrar un estado vacío compacto dentro de esa columna.

#### Scenario: Tareas agrupadas por status
- **WHEN** el listado contiene tareas `pending`, `in_progress` y `done`
- **THEN** cada tarea aparece únicamente en la columna que corresponde a su `status`

#### Scenario: Sin filtro de status muestra todas las columnas
- **WHEN** un usuario navega al listado sin search param `status`
- **THEN** el tablero muestra las columnas `Pendiente`, `En curso` y `Hecha`

#### Scenario: Filtro de status limita columnas
- **WHEN** el usuario llega con `status=pending,in_progress` en la URL
- **THEN** el tablero muestra columnas para `Pendiente` y `En curso`, y no muestra columna `Hecha`

#### Scenario: Columna vacía muestra estado compacto
- **WHEN** el filtro incluye `done` pero no existen tareas visibles con `status = "done"`
- **THEN** la columna `Hecha` se muestra con conteo cero y un mensaje vacío compacto

### Requirement: Filtro por visibilidad en listado visual
El sistema SHALL aplicar el filtro por `visibility` como filtro transversal sobre ambos modos visuales. El filtro SHALL estar disponible como dropdown multiselect con checkboxes cuando el viewer tenga permiso para listar más de una visibilidad de tareas. Para viewers cuya autorización solo permite `active`, el sistema SHALL ocultar el control de `visibility` o presentarlo como valor fijo no editable.

El dropdown de visibilidad SHALL permitir seleccionar cero, uno o varios valores (`draft`, `active`, `archived`) y SHALL persistir la selección en la URL mediante `visibility=<valores separados por coma>`. Cuando no haya selección de `visibility`, el sistema SHALL interpretar ausencia del parámetro como ausencia de filtro de visibilidad para viewers autorizados a ver todas.

#### Scenario: Admin filtra por visibilidad en tablero
- **WHEN** un admin abre `/admin/tasks` y selecciona `visibility=draft,active` desde el dropdown multiselect
- **THEN** el tablero muestra solo tareas `draft` o `active` de la organización, agrupadas por status

#### Scenario: Vista tarjetas respeta visibilidad
- **WHEN** un admin cambia a `view=cards` con `visibility=archived`
- **THEN** la grilla muestra solo tarjetas de tareas archivadas que cumplan los demás filtros

#### Scenario: Member regular no ve filtro inútil de visibilidad
- **WHEN** un member regular abre `/tasks`
- **THEN** no se le ofrece un filtro editable de `visibility` porque su listado efectivo está limitado a tareas `active` visibles

#### Scenario: Limpiar visibilidad elimina filtro
- **WHEN** un admin limpia todas las opciones del dropdown de visibilidad
- **THEN** la URL no conserva `visibility` y la consulta no filtra por visibilidad

## REMOVED Requirements

### Requirement: Sin drag-and-drop en v1
**Reason**: El tablero ahora debe ser operativo, no solo visual. El cambio de estado por drag-and-drop queda permitido como gesto de intención, manteniendo trazabilidad mediante comentario obligatorio.

**Migration**: Reemplazar la prohibición por el requirement `Drag-and-drop trazable en tablero`. La implementación debe seguir invocando `changeTaskStatus` y no introducir ninguna mutación alternativa de `task.status`.
