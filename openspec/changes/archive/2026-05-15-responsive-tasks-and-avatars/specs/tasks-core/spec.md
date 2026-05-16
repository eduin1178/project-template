## ADDED Requirements

### Requirement: Layout responsivo de la bandeja de tareas

El sistema SHALL renderizar las rutas `/tasks` y `/admin/tasks` mediante un layout que combine **lista** y **detalle** como secciones cooperantes con comportamiento responsivo según el ancho del viewport:

- **Desktop (`lg` y mayor, ≥1024px):** SHALL mostrar simultáneamente la lista de tareas y el detalle de la tarea seleccionada lado a lado, junto con el panel lateral de filtros (donde aplique). El comportamiento visual SHALL ser equivalente al actual: filtros + lista + detalle como tres columnas.
- **Tablet y mobile (`< lg`, <1024px):** SHALL mostrar **una sola sección a la vez**. Si la URL no incluye un `taskId`, SHALL mostrar únicamente la lista (ocupando todo el ancho disponible). Si la URL incluye un `taskId`, SHALL mostrar únicamente el detalle de esa tarea (ocupando todo el ancho disponible).
- En mobile, cuando se muestra el detalle, SHALL exponer un control "Volver a la lista" en la parte superior del panel que navegue a la ruta de lista (`/tasks` o `/admin/tasks` según corresponda) sin perder los filtros vigentes en la URL.

El layout NO SHALL depender de JavaScript en el cliente para decidir qué sección mostrar: la decisión SHALL surgir del estado de la URL (presencia o ausencia del segmento `[taskId]`) combinada con clases CSS responsivas. Esto permite que el deep-link a una tarea funcione directamente en mobile sin un parpadeo intermedio.

#### Scenario: Desktop muestra lista y detalle en paralelo
- **WHEN** un usuario en desktop (viewport ≥1024px) navega a `/tasks/<id>` o `/admin/tasks/<id>` con permiso de lectura sobre la tarea
- **THEN** se renderizan simultáneamente la lista (con la fila seleccionada destacada) y el detalle de la tarea, lado a lado

#### Scenario: Mobile sin taskId muestra solo lista
- **WHEN** un usuario en viewport <1024px navega a `/tasks` o `/admin/tasks` (sin segmento `[taskId]`)
- **THEN** se renderiza únicamente la lista ocupando todo el ancho; el detalle no se muestra

#### Scenario: Mobile con taskId muestra solo detalle
- **WHEN** un usuario en viewport <1024px navega a `/tasks/<id>` o `/admin/tasks/<id>`
- **THEN** se renderiza únicamente el detalle ocupando todo el ancho; la lista no se muestra

#### Scenario: Mobile expone control para volver a la lista
- **WHEN** un usuario en mobile está viendo el detalle de una tarea
- **THEN** el detail pane muestra un control "Volver a la lista" o equivalente en su parte superior que navega a la ruta de lista preservando los searchParams de filtros vigentes

#### Scenario: Resize de viewport mientras hay tarea seleccionada
- **WHEN** un usuario está en desktop con `/tasks/<id>` y reduce el viewport a <1024px
- **THEN** la UI pasa a mostrar solo el detalle (la lista se oculta) sin perder la selección ni cambiar la URL

### Requirement: Ruta dedicada para detalle de tarea

El sistema SHALL exponer la ruta `/tasks/[taskId]` y `/admin/tasks/[taskId]` como segmento de URL canónico para representar el detalle de una tarea seleccionada. Esta ruta reemplaza al mecanismo previo basado en query param `?taskId=<id>`.

La selección de una tarea desde la lista SHALL navegar al segmento dinámico (`/tasks/<id>` o `/admin/tasks/<id>`), preservando los searchParams existentes (filtros). Limpiar la selección SHALL navegar a la ruta base de la lista preservando filtros.

El sistema NO SHALL leer el query param `?taskId=` como mecanismo de selección. Si una URL legacy con `?taskId=<id>` llega al servidor, el handler SHALL redirigir con HTTP 308 a la ruta canónica equivalente (`/tasks?taskId=X` → `/tasks/X`, `/admin/tasks?taskId=X` → `/admin/tasks/X`), preservando el resto de los searchParams.

#### Scenario: Click en fila navega a /tasks/[taskId]
- **WHEN** un usuario hace click en una fila de la lista en `/tasks` con filtros activos en la URL
- **THEN** el navegador navega a `/tasks/<id>` preservando los searchParams de filtros

#### Scenario: Click en fila navega a /admin/tasks/[taskId]
- **WHEN** un admin hace click en una fila de la lista en `/admin/tasks` con filtros activos
- **THEN** el navegador navega a `/admin/tasks/<id>` preservando los searchParams de filtros

#### Scenario: Deep-link a /tasks/[taskId] renderiza detalle
- **WHEN** un usuario con visibilidad sobre la tarea navega directamente a `/tasks/<id>`
- **THEN** el detalle se renderiza server-side; en desktop con la lista al costado, en mobile ocupando todo el ancho

#### Scenario: Deep-link a tarea sin permiso
- **WHEN** un usuario sin visibilidad sobre la tarea navega directamente a `/tasks/<id>` o `/admin/tasks/<id>`
- **THEN** el sistema responde con 404 (o equivalente) sin filtrar la existencia de la tarea

#### Scenario: Redirect legacy de query param a ruta
- **WHEN** un usuario navega a `/tasks?taskId=<id>` o `/admin/tasks?taskId=<id>`
- **THEN** el servidor responde con HTTP 308 a `/tasks/<id>` o `/admin/tasks/<id>` respectivamente, preservando los demás searchParams

#### Scenario: Limpieza de selección preserva filtros
- **WHEN** un usuario en `/tasks/<id>?status=in_progress` invoca la acción de cerrar o volver a la lista
- **THEN** el navegador navega a `/tasks?status=in_progress`

### Requirement: Panel de filtros responsivo

El sistema SHALL renderizar el panel de filtros de tareas (en `/tasks` y en `/admin/tasks`) según el ancho del viewport:

- **Desktop (`md` y mayor, ≥768px):** SHALL mostrar el panel de filtros como una columna lateral (`aside`) fija a la izquierda, comportamiento equivalente al actual.
- **Tablet y mobile (`< md`, <768px):** SHALL ocultar el panel lateral y exponer un botón "Filtros" en la barra superior de la lista que abre los mismos filtros dentro de un componente `Sheet` (drawer) lateral.

El contenido y la semántica de los filtros (submit por click en cada opción, persistencia en URL, etiquetas de conteo) SHALL ser idénticos en ambas presentaciones. El estado seleccionado SHALL reflejarse visualmente en el botón "Filtros" cuando hay al menos un filtro distinto del default activo (por ejemplo, mediante un badge con el conteo de filtros activos o una variante visual del botón).

#### Scenario: Desktop muestra filtros como columna lateral
- **WHEN** un usuario en viewport ≥768px abre `/tasks` o `/admin/tasks`
- **THEN** los filtros se renderizan como columna lateral fija a la izquierda

#### Scenario: Mobile muestra botón Filtros que abre Sheet
- **WHEN** un usuario en viewport <768px abre `/tasks` o `/admin/tasks`
- **THEN** los filtros NO se muestran como columna lateral; en su lugar se muestra un botón "Filtros" en la barra de la lista que, al pulsarse, abre un `Sheet` lateral con los mismos filtros

#### Scenario: Filtros activos reflejados en el botón mobile
- **WHEN** un usuario en mobile aplica al menos un filtro distinto del default
- **THEN** el botón "Filtros" muestra una indicación visual (badge con conteo o variante diferenciada) de que hay filtros activos

#### Scenario: Aplicar filtros en mobile actualiza URL y cierra Sheet
- **WHEN** un usuario en mobile abre el `Sheet` de filtros, selecciona una opción y confirma
- **THEN** la URL se actualiza con los searchParams correspondientes, la lista se refresca y el `Sheet` se cierra

#### Scenario: Copy en español neutral
- **WHEN** se inspecciona el copy del botón y el `Sheet` de filtros en mobile
- **THEN** todas las cadenas usan formas neutras (`tú`, "Filtros", "Aplica", "Cierra") y NO contienen voseo
