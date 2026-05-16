## MODIFIED Requirements

### Requirement: Layout responsivo de la bandeja de tareas

El sistema SHALL renderizar las rutas `/tasks` y `/admin/tasks` mediante un layout que combine **lista** y **detalle** como secciones cooperantes con comportamiento responsivo según el ancho del viewport:

- **Desktop (`lg` y mayor, ≥1024px):** SHALL mostrar simultáneamente la lista de tareas y el detalle de la tarea seleccionada lado a lado. Los filtros NO SHALL renderizarse como columna lateral permanente; SHALL ser accesibles mediante el mismo botón "Filtros" descrito en el requirement "Panel de filtros unificado".
- **Tablet y mobile (`< lg`, <1024px):** SHALL mostrar **una sola sección a la vez**. Si la URL no incluye un `taskId`, SHALL mostrar únicamente la lista (ocupando todo el ancho disponible). Si la URL incluye un `taskId`, SHALL mostrar únicamente el detalle de esa tarea (ocupando todo el ancho disponible).
- En mobile, cuando se muestra el detalle, SHALL exponer un control "Volver a la lista" en la parte superior del panel que navegue a la ruta de lista (`/tasks` o `/admin/tasks` según corresponda) sin perder los filtros vigentes en la URL.

El layout NO SHALL depender de JavaScript en el cliente para decidir qué sección mostrar: la decisión SHALL surgir del estado de la URL (presencia o ausencia del segmento `[taskId]`) combinada con clases CSS responsivas. Esto permite que el deep-link a una tarea funcione directamente en mobile sin un parpadeo intermedio.

#### Scenario: Desktop muestra lista y detalle en paralelo sin panel lateral de filtros
- **WHEN** un usuario en desktop (viewport ≥1024px) navega a `/tasks/<id>` o `/admin/tasks/<id>` con permiso de lectura sobre la tarea
- **THEN** se renderizan simultáneamente la lista (con la fila seleccionada destacada) y el detalle de la tarea, lado a lado, sin un `aside` de filtros visible

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

### Requirement: Panel de filtros unificado

El sistema SHALL renderizar el control de filtros de tareas (en `/tasks` y en `/admin/tasks`) mediante un único punto de entrada en TODOS los viewports: un botón "Filtros" ubicado en la barra superior de la lista, que al pulsarse abre un componente `Sheet` (drawer) lateral con el panel de filtros.

El sistema NO SHALL renderizar un panel lateral permanente (`aside`) de filtros en ningún viewport. El comportamiento es idéntico en mobile, tablet y desktop.

El contenido y la semántica de los filtros (submit por click en cada opción, persistencia en URL, etiquetas de conteo) SHALL ser los mismos que antes. El estado seleccionado SHALL reflejarse visualmente en el botón "Filtros" cuando hay al menos un filtro distinto del default activo (mediante un badge con el conteo de filtros activos).

#### Scenario: Desktop NO muestra filtros como columna lateral
- **WHEN** un usuario en viewport ≥1024px abre `/tasks` o `/admin/tasks`
- **THEN** NO se renderiza un `aside` de filtros visible; el botón "Filtros" aparece en la barra superior de la lista

#### Scenario: Mobile muestra botón Filtros que abre Sheet
- **WHEN** un usuario en viewport <768px abre `/tasks` o `/admin/tasks`
- **THEN** se muestra un botón "Filtros" en la barra de la lista que, al pulsarse, abre un `Sheet` lateral con los mismos filtros

#### Scenario: Botón Filtros visible en todos los viewports
- **WHEN** un usuario abre `/tasks` o `/admin/tasks` en cualquier viewport (mobile, tablet o desktop)
- **THEN** el botón "Filtros" está presente en la barra superior de la lista

#### Scenario: Filtros activos reflejados en el botón
- **WHEN** un usuario aplica al menos un filtro distinto del default
- **THEN** el botón "Filtros" muestra un badge con el conteo de filtros activos

#### Scenario: Aplicar filtros actualiza URL y cierra Sheet
- **WHEN** un usuario abre el `Sheet` de filtros (en cualquier viewport), selecciona una opción y la confirma
- **THEN** la URL se actualiza con los searchParams correspondientes, la lista se refresca y el `Sheet` se cierra

#### Scenario: Copy en español neutral
- **WHEN** se inspecciona el copy del botón y el `Sheet` de filtros
- **THEN** todas las cadenas usan formas neutras (`tú`, "Filtros", "Aplica", "Cierra") y NO contienen voseo
