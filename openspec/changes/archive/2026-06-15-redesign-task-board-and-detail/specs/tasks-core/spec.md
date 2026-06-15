## MODIFIED Requirements

### Requirement: Layout responsivo de la bandeja de tareas
El sistema SHALL renderizar las rutas base `/tasks` y `/admin/tasks` como una vista visual de listado, no como una bandeja lista-detalle. La vista base SHALL mostrar controles de filtros, toggle de modo visual y tarjetas de tareas según el modo seleccionado (`board` o `cards`).

- **Desktop (`lg` y mayor, ≥1024px):** SHALL mostrar el listado visual ocupando el área principal disponible. En modo `board`, las columnas por status se muestran en paralelo cuando el ancho lo permita; en modo `cards`, las tarjetas se muestran en grilla responsive.
- **Tablet y mobile (`< lg`, <1024px):** SHALL mostrar el listado visual en una sola columna de lectura. En modo `board`, las columnas se apilan verticalmente; en modo `cards`, las tarjetas se muestran una debajo de otra.
- Las rutas con segmento `[taskId]` SHALL renderizar una página de detalle dedicada, no una lista lateral con detalle embebido.
- La decisión de qué página renderizar SHALL surgir de la ruta: ruta base para listado, ruta `[taskId]` para detalle. El sistema NO SHALL depender de JavaScript cliente para cambiar entre listado y detalle.

#### Scenario: Desktop muestra tablero visual en ruta base
- **WHEN** un usuario en desktop navega a `/tasks` o `/admin/tasks` sin `taskId`
- **THEN** se renderiza el listado visual con controles de filtros y modo, sin panel de detalle lateral

#### Scenario: Desktop muestra detalle dedicado con taskId
- **WHEN** un usuario en desktop navega a `/tasks/<id>` o `/admin/tasks/<id>` con permiso de lectura
- **THEN** se renderiza una página de detalle dedicada para esa tarea, sin lista lateral de tareas

#### Scenario: Mobile base muestra listado visual
- **WHEN** un usuario en viewport <1024px navega a `/tasks` o `/admin/tasks`
- **THEN** se renderiza el listado visual adaptado a una columna o columnas apiladas según el modo

#### Scenario: Mobile detalle muestra página vertical
- **WHEN** un usuario en viewport <1024px navega a `/tasks/<id>` o `/admin/tasks/<id>`
- **THEN** se renderiza únicamente el detalle de esa tarea en una composición vertical optimizada para móvil

#### Scenario: Resize conserva la URL y la intención
- **WHEN** un usuario cambia el tamaño del viewport mientras está en `/tasks/<id>`
- **THEN** la UI reorganiza el layout del detalle sin cambiar la URL ni perder la tarea seleccionada

### Requirement: Ruta dedicada para detalle de tarea
El sistema SHALL exponer la ruta `/tasks/[taskId]` y `/admin/tasks/[taskId]` como segmento de URL canónico para representar el detalle dedicado de una tarea seleccionada. Esta ruta reemplaza al mecanismo previo basado en query param `?taskId=<id>` y ya no renderiza una bandeja lista-detalle.

La selección de una tarea desde el listado visual SHALL navegar al segmento dinámico (`/tasks/<id>` o `/admin/tasks/<id>`), preservando los searchParams existentes, incluyendo filtros y modo de vista (`view=board|cards`). Volver al listado SHALL navegar a la ruta base correspondiente preservando los searchParams vigentes.

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

### Requirement: Panel de filtros unificado
El sistema SHALL renderizar el control de filtros de tareas (en `/tasks` y en `/admin/tasks`) mediante un único punto de entrada en todos los viewports: un botón `Filtros` ubicado en la barra superior del listado visual, que al pulsarse abre un componente `Sheet` o panel equivalente con los filtros aplicables.

El sistema NO SHALL renderizar un panel lateral permanente (`aside`) de filtros en ningún viewport. El comportamiento es idéntico en mobile, tablet y desktop.

El contenido y la semántica de los filtros SHALL preservar submit por interacción, persistencia en URL y etiquetas de conteo. El estado seleccionado SHALL reflejarse visualmente en el botón `Filtros` cuando hay al menos un filtro distinto del default activo, mediante un badge con el conteo de filtros activos. El filtro de `visibility` SHALL mostrarse solo cuando sea aplicable según permisos efectivos del viewer.

#### Scenario: Desktop NO muestra filtros como columna lateral
- **WHEN** un usuario en viewport ≥1024px abre `/tasks` o `/admin/tasks`
- **THEN** NO se renderiza un `aside` de filtros visible; el botón `Filtros` aparece en la barra superior del listado visual

#### Scenario: Mobile muestra botón Filtros que abre Sheet
- **WHEN** un usuario en viewport <768px abre `/tasks` o `/admin/tasks`
- **THEN** se muestra un botón `Filtros` en la barra del listado que, al pulsarse, abre un `Sheet` lateral o inferior con los filtros aplicables

#### Scenario: Botón Filtros visible en todos los viewports
- **WHEN** un usuario abre `/tasks` o `/admin/tasks` en cualquier viewport
- **THEN** el botón `Filtros` está presente en la barra superior del listado visual

#### Scenario: Filtros activos reflejados en el botón
- **WHEN** un usuario aplica al menos un filtro distinto del default
- **THEN** el botón `Filtros` muestra un badge con el conteo de filtros activos

#### Scenario: Aplicar filtros actualiza URL y cierra Sheet
- **WHEN** un usuario abre el panel de filtros, selecciona una opción y la confirma
- **THEN** la URL se actualiza con los searchParams correspondientes, la lista se refresca y el panel se cierra

#### Scenario: Copy en español neutral
- **WHEN** se inspecciona el copy del botón y el panel de filtros
- **THEN** todas las cadenas usan formas neutras (`tú`, `Filtros`, `Aplica`, `Cierra`) y NO contienen voseo

### Requirement: Presentación full-page del detalle de tarea
El sistema SHALL renderizar el detalle de una tarea como página dedicada con composición responsive. El detalle SHALL incluir: header con título y acciones permitidas, badges de `visibility` y `status`, vencimiento, responsable/equipo, descripción, checklist, documentos adjuntos y comentarios.

En desktop amplio, el contenido SHALL usar una composición de dos zonas: columna principal para descripción, checklist y documentos; columna secundaria para comentarios. En tablet y mobile, todas las secciones SHALL fluir en una sola columna en orden lógico: header, metadatos, descripción, checklist, documentos y comentarios. Las acciones SHALL seguir renderizándose condicionalmente según `TaskCapabilities`.

#### Scenario: Desktop muestra detalle con comentarios laterales
- **WHEN** un usuario abre `/tasks/<id>` o `/admin/tasks/<id>` en desktop amplio
- **THEN** el detalle muestra contenido principal a la izquierda y comentarios en una columna secundaria a la derecha

#### Scenario: Mobile muestra detalle en flujo vertical
- **WHEN** un usuario abre el detalle en mobile
- **THEN** descripción, checklist, documentos y comentarios se muestran en una sola columna legible

#### Scenario: Header conserva acciones por capabilities
- **WHEN** un viewer no tiene `canEditContent` ni `canEditDueAt`
- **THEN** el detalle no muestra el botón `Editar`, aunque el layout full-page esté activo

#### Scenario: Detalle muestra metadatos esenciales
- **WHEN** un usuario abre el detalle de una tarea
- **THEN** ve título, status, visibility, vencimiento y responsable o ausencia de responsable sin entrar en tabs
