# task-checklist Specification

## Purpose

Checklist colaborativo por tarea. Define el modelo `TaskChecklistItem`, la matriz de autorización por `visibility` de la tarea (draft → autor+admin/owner; active → admin/owner+autor+responsable+assignees; archived → nadie), las server actions de crear/editar label/togglear/eliminar con toggle idempotente y auditoría persistida (`checkedById`/`checkedAt` no expuestos en UI v1), la capability proyectada `canManageChecklist`, la carga del checklist junto al detalle de la tarea ordenada por `createdAt ASC`, y el bloque UI inline en el tab Detalle de `TaskDetailPane` con render condicional según items + capability. Orden inmutable por `createdAt`; sin reorder ni paginación en v1.

## Requirements

### Requirement: Modelo `TaskChecklistItem`

El sistema SHALL exponer una entidad `TaskChecklistItem` persistida en Postgres en una tabla `task_checklist_item` con los siguientes atributos: `id` (texto, PK), `taskId` (texto, FK a `task.id`, `ON DELETE CASCADE`, requerido), `label` (texto, requerido, longitud post-trim entre 1 y 200 caracteres inclusive), `checked` (boolean, default `false`, NOT NULL), `checkedById` (texto, FK a `user.id`, `ON DELETE SET NULL`, nullable), `checkedAt` (timestamp con zona, nullable), `createdAt` (timestamp con zona, asignado automáticamente al instante de inserción), `updatedAt` (timestamp con zona, refrescado en cada modificación). La tabla SHALL tener un índice sobre `(taskId, createdAt)` para soportar listados por tarea ordenados cronológicamente ascendente.

#### Scenario: Inserción asigna timestamps y defaults

- **WHEN** se inserta un `task_checklist_item` con `label = "Revisar contrato"` sin proveer `checked`, `checkedById`, `checkedAt`, `createdAt` ni `updatedAt`
- **THEN** se persiste con `checked = false`, `checkedById = NULL`, `checkedAt = NULL`, y `createdAt` e `updatedAt` asignados al instante actual

#### Scenario: Update refresca updatedAt

- **WHEN** se modifica cualquier atributo de un `task_checklist_item` existente
- **THEN** `updatedAt` se refresca al instante de la modificación y `createdAt` permanece inalterado

#### Scenario: Borrado de tarea elimina items en cascada

- **WHEN** se elimina una tarea (vía `deleteTask`)
- **THEN** todas las filas de `task_checklist_item` con ese `taskId` se eliminan automáticamente por la FK CASCADE

#### Scenario: Borrado de usuario nulifica checkedById

- **WHEN** se elimina un `user` referenciado como `checkedById` de uno o más items
- **THEN** esas filas permanecen y `checkedById` queda en `NULL`; `checkedAt` permanece con su valor previo

#### Scenario: Label con longitud máxima exacta

- **WHEN** se intenta crear un item con `label` de exactamente 200 caracteres (post-trim)
- **THEN** la operación se persiste

#### Scenario: Label con longitud excedida

- **WHEN** se intenta crear o actualizar un item con `label` de 201 caracteres o más (post-trim)
- **THEN** la operación falla con error de validación y nada se persiste

#### Scenario: Label vacío rechazado

- **WHEN** se intenta crear o actualizar un item con `label` que post-trim queda vacío (cadena vacía, solo espacios, solo tabulaciones)
- **THEN** la operación falla con error de validación y nada se persiste

### Requirement: Matriz de autorización por `visibility`

El sistema SHALL determinar quién puede mutar items del checklist (crear, editar `label`, togglear `checked`, eliminar) según la `visibility` de la tarea contenedora:

- Si `visibility = 'draft'`: SHALL permitir SOLO al `authorId` de la tarea y a usuarios con `member.role` igual a `admin` u `owner` en la organización de la tarea.
- Si `visibility = 'active'`: SHALL permitir a cualquier viewer con visibilidad sobre la tarea según la regla definida en `task-assignments`. Es decir: `admin`/`owner` siempre; `member` regular solo si es `authorId`, `responsibleId` o existe en `task_assignee`.
- Si `visibility = 'archived'`: SHALL rechazar a cualquier invocador, incluyendo `admin` y `owner`.

Las cuatro operaciones (crear item, editar `label`, togglear `checked`, eliminar item) SHALL compartir exactamente el mismo gate; el sistema NO SHALL distinguir entre "definir items" y "marcar items". Usuarios sin organización activa o fuera de la organización de la tarea SHALL recibir error de autorización.

#### Scenario: Autor crea item en draft

- **WHEN** el `authorId` de una tarea con `visibility = "draft"` invoca `createChecklistItem`
- **THEN** el item se persiste

#### Scenario: Admin crea item en draft de tarea ajena

- **WHEN** un `admin` u `owner` que NO es el autor invoca `createChecklistItem` sobre una tarea con `visibility = "draft"` de su organización
- **THEN** el item se persiste

#### Scenario: Responsable NO puede mutar checklist en draft

- **WHEN** un `member` regular con `responsibleId = me` invoca `createChecklistItem` sobre una tarea con `visibility = "draft"` (donde es visible por ser responsable, aunque sin ver el detalle)
- **THEN** la operación falla con error de autorización

#### Scenario: Assignee NO puede mutar checklist en draft

- **WHEN** un `member` regular presente en `task_assignee` invoca cualquier operación de mutación sobre el checklist de una tarea con `visibility = "draft"`
- **THEN** la operación falla con error de autorización

#### Scenario: Admin muta checklist en active

- **WHEN** un `admin` u `owner` invoca cualquier mutación sobre el checklist de una tarea con `visibility = "active"` de su organización
- **THEN** la operación procede

#### Scenario: Autor muta checklist en active

- **WHEN** un `member` que es `authorId` invoca cualquier mutación sobre el checklist de su tarea con `visibility = "active"`
- **THEN** la operación procede

#### Scenario: Responsable muta checklist en active

- **WHEN** un `member` con `responsibleId = me` invoca cualquier mutación sobre el checklist de la tarea en `visibility = "active"`
- **THEN** la operación procede

#### Scenario: Assignee muta checklist en active

- **WHEN** un `member` presente en `task_assignee` invoca cualquier mutación sobre el checklist de la tarea en `visibility = "active"`
- **THEN** la operación procede

#### Scenario: Member sin participación NO muta en active

- **WHEN** un `member` regular que NO es autor, responsable ni assignee de una tarea con `visibility = "active"` invoca cualquier mutación sobre su checklist
- **THEN** la operación falla con error de autorización

#### Scenario: Nadie muta checklist en archived

- **WHEN** un `admin`, `owner`, autor, responsable o assignee invoca cualquier mutación sobre el checklist de una tarea con `visibility = "archived"`
- **THEN** la operación falla con error de validación y el checklist permanece inalterado

#### Scenario: Usuario fuera de la org NO muta

- **WHEN** un usuario sin membresía en la organización de la tarea invoca cualquier mutación sobre el checklist
- **THEN** la operación falla con error de autorización

#### Scenario: Usuario sin organización activa NO muta

- **WHEN** un usuario autenticado sin `activeOrganizationId` invoca cualquier mutación sobre el checklist
- **THEN** la operación falla con error de autorización

### Requirement: Server action `createChecklistItem`

El sistema SHALL exponer una server action `createChecklistItem(taskId, label)` que: (1) verifica que la tarea existe y pertenece a la organización del invocador, (2) aplica la matriz de autorización por `visibility`, (3) valida que `label` post-trim tenga entre 1 y 200 caracteres, (4) inserta una nueva fila con `checked = false`, `checkedById = NULL`, `checkedAt = NULL`, y (5) retorna el item creado.

#### Scenario: Crear item válido

- **WHEN** un invocador autorizado invoca `createChecklistItem` con `taskId` válido y `label = "  Revisar contrato  "` (con espacios al inicio y final)
- **THEN** se persiste un item con `label = "Revisar contrato"` (trimmed), `checked = false`, `checkedById = NULL`, `checkedAt = NULL` y la action retorna el item

#### Scenario: Crear con label inválido

- **WHEN** un invocador autorizado invoca `createChecklistItem` con `label = "   "` (solo espacios)
- **THEN** la operación falla con error de validación y nada se persiste

#### Scenario: Crear sobre tarea de otra org

- **WHEN** un invocador invoca `createChecklistItem` apuntando a un `taskId` cuya tarea pertenece a otra organización
- **THEN** la operación falla con error de autorización

### Requirement: Server action `updateChecklistItemLabel`

El sistema SHALL exponer una server action `updateChecklistItemLabel(itemId, label)` que: (1) carga el item y la tarea contenedora, (2) verifica pertenencia a la organización del invocador, (3) aplica la matriz de autorización por `visibility`, (4) valida `label` post-trim entre 1 y 200 caracteres, (5) actualiza `label` y refresca `updatedAt`. La operación NO SHALL modificar `checked`, `checkedById` ni `checkedAt`.

#### Scenario: Actualizar label válido

- **WHEN** un invocador autorizado invoca `updateChecklistItemLabel` con un nuevo `label` válido
- **THEN** el `label` se actualiza, `updatedAt` se refresca y los campos `checked`, `checkedById`, `checkedAt` permanecen inalterados

#### Scenario: Actualizar label inválido

- **WHEN** un invocador autorizado invoca `updateChecklistItemLabel` con `label = ""` (vacío)
- **THEN** la operación falla con error de validación y el item permanece sin cambios

#### Scenario: Actualizar item inexistente

- **WHEN** un invocador invoca `updateChecklistItemLabel` con un `itemId` que no existe
- **THEN** la operación falla con error claro de "item no encontrado"

### Requirement: Server action `toggleChecklistItem`

El sistema SHALL exponer una server action `toggleChecklistItem(itemId, checked)` que: (1) carga el item y la tarea contenedora, (2) verifica pertenencia a la organización del invocador, (3) aplica la matriz de autorización por `visibility`, (4) si el `checked` solicitado es igual al actual, retorna éxito sin modificar nada (no-op idempotente), (5) si difiere y el nuevo valor es `true`, persiste `checked = true`, `checkedById = invocador.id`, `checkedAt = now()`, `updatedAt = now()`, (6) si difiere y el nuevo valor es `false`, persiste `checked = false`, `checkedById = NULL`, `checkedAt = NULL`, `updatedAt = now()`.

#### Scenario: Marcar item destildado

- **WHEN** un invocador autorizado invoca `toggleChecklistItem(itemId, true)` sobre un item con `checked = false`
- **THEN** el item queda con `checked = true`, `checkedById = invocador.id`, `checkedAt = now`

#### Scenario: Destildar item marcado

- **WHEN** un invocador autorizado invoca `toggleChecklistItem(itemId, false)` sobre un item con `checked = true`
- **THEN** el item queda con `checked = false`, `checkedById = NULL`, `checkedAt = NULL`

#### Scenario: Re-marcar item ya marcado es no-op

- **WHEN** un invocador autorizado invoca `toggleChecklistItem(itemId, true)` sobre un item que ya tiene `checked = true`
- **THEN** la operación retorna éxito sin modificar ningún campo (ni `checkedById`, ni `checkedAt`, ni `updatedAt`)

#### Scenario: Re-destildar item ya destildado es no-op

- **WHEN** un invocador autorizado invoca `toggleChecklistItem(itemId, false)` sobre un item que ya tiene `checked = false`
- **THEN** la operación retorna éxito sin modificar ningún campo

#### Scenario: Toggle por otro usuario sobrescribe checkedById

- **WHEN** un item está marcado con `checkedById = Ana`, otro invocador autorizado (Bruno) lo destilda y luego un tercero (Carla) lo vuelve a marcar
- **THEN** el item queda con `checkedById = Carla` y `checkedAt = el instante de la última marca`

### Requirement: Server action `deleteChecklistItem`

El sistema SHALL exponer una server action `deleteChecklistItem(itemId)` que: (1) carga el item y la tarea contenedora, (2) verifica pertenencia a la organización del invocador, (3) aplica la matriz de autorización por `visibility`, (4) elimina físicamente la fila del item. La eliminación es hard-delete e irreversible.

#### Scenario: Eliminar item existente

- **WHEN** un invocador autorizado invoca `deleteChecklistItem` sobre un item de una tarea visible
- **THEN** la fila se elimina y la action retorna éxito

#### Scenario: Eliminar item inexistente

- **WHEN** un invocador invoca `deleteChecklistItem` con un `itemId` que no existe
- **THEN** la operación falla con error claro de "item no encontrado"

#### Scenario: Eliminar item de otra org

- **WHEN** un invocador invoca `deleteChecklistItem` sobre un item cuya tarea pertenece a otra organización
- **THEN** la operación falla con error de autorización

### Requirement: Capability `canManageChecklist` proyectada

El sistema SHALL extender el contrato `TaskCapabilities` con un campo booleano `canManageChecklist` calculado server-side por cada tarea visible al viewer. `canManageChecklist` SHALL ser `true` si y solo si el viewer puede mutar items según la matriz de autorización por `visibility`:

- Tarea en `draft`: `true` si el viewer es `authorId` O tiene rol `admin`/`owner` en la organización de la tarea.
- Tarea en `active`: `true` si el viewer es `admin`/`owner`, `authorId`, `responsibleId`, o existe en `task_assignee`.
- Tarea en `archived`: siempre `false`.

La autorización final vive en las server actions; `canManageChecklist` es una proyección server-side que evita renderizar controles cuando las acciones fallarían.

#### Scenario: Admin tiene canManageChecklist en cualquier visibility no archived

- **WHEN** un `admin` u `owner` abre el detalle de una tarea de su organización con `visibility = "draft"` o `"active"`
- **THEN** la tarea llega con `capabilities.canManageChecklist = true`

#### Scenario: Admin NO tiene canManageChecklist en archived

- **WHEN** un `admin` u `owner` abre el detalle de una tarea con `visibility = "archived"`
- **THEN** la tarea llega con `capabilities.canManageChecklist = false`

#### Scenario: Autor tiene canManageChecklist en draft propio

- **WHEN** un `member` que es `authorId` de una tarea con `visibility = "draft"` abre el detalle
- **THEN** `capabilities.canManageChecklist = true`

#### Scenario: Responsable tiene canManageChecklist solo en active

- **WHEN** un `member` con `responsibleId = me` abre una tarea con `visibility = "active"`
- **THEN** `capabilities.canManageChecklist = true`

- **WHEN** un `member` con `responsibleId = me` abre una tarea con `visibility = "draft"` (siendo visible por la regla de responsable)
- **THEN** `capabilities.canManageChecklist = false`

#### Scenario: Assignee tiene canManageChecklist solo en active

- **WHEN** un `member` presente en `task_assignee` abre una tarea con `visibility = "active"`
- **THEN** `capabilities.canManageChecklist = true`

#### Scenario: Member sin participación

- **WHEN** un `member` que no es autor, responsable ni assignee abre (de algún modo) el detalle de una tarea
- **THEN** la regla de visibilidad de la tarea ya filtra antes; si llegara, `capabilities.canManageChecklist = false`

### Requirement: Lectura del checklist junto con el detalle

El sistema SHALL cargar la lista completa de items del checklist al cargar el detalle de una tarea visible al viewer, ordenados por `createdAt ASC`. La consulta SHALL ejecutarse server-side sin paginación en v1. La lista SHALL exponer al cliente los campos `id`, `label`, `checked`, `createdAt` por item. Los campos `checkedById` y `checkedAt` se persisten en DB pero NO SHALL viajar al cliente en v1.

#### Scenario: Items llegan ordenados por createdAt ASC

- **WHEN** una tarea tiene tres items creados en momentos distintos
- **THEN** la lista los entrega del más antiguo al más reciente

#### Scenario: Tarea sin items

- **WHEN** una tarea no tiene items en su checklist
- **THEN** la lista llega como array vacío

#### Scenario: Campos de auditoría no viajan al cliente en v1

- **WHEN** una tarea con items checked llega al cliente
- **THEN** los items contienen `id`, `label`, `checked`, `createdAt` pero NO contienen `checkedById` ni `checkedAt`

### Requirement: UI inline del checklist en el tab `Detalle`

El sistema SHALL renderizar un bloque `TaskChecklistPanel` dentro del `TabsContent value="detail"` de `TaskDetailPane`, ubicado debajo del bloque de descripción de la tarea. El sistema NO SHALL agregar un trigger nuevo al `TabsList` del detail pane; los tres triggers existentes (`Detalle`, `Comentarios`, `Documentos`) permanecen.

El render del bloque SHALL ser condicional según el estado del checklist y la capability:

- Si NO hay items Y `canManageChecklist = false`: el bloque NO SHALL renderizarse (sin título, sin contenedor, sin ruido visual).
- Si NO hay items Y `canManageChecklist = true`: el bloque SHALL renderizarse con título "Checklist" y un input "+ agregar item".
- Si hay items: el bloque SHALL renderizarse con título "Checklist", la lista de items en orden `createdAt ASC`, y (si `canManageChecklist = true`) un input "+ agregar item" al final.

Cada fila de item SHALL mostrar un checkbox y el `label`. El comportamiento por fila depende de `canManageChecklist`:

- Con `canManageChecklist = true`: el checkbox SHALL ser interactivo; click en el `label` SHALL habilitar edición inline; un botón "Eliminar" SHALL aparecer al hover o como ícono persistente en la fila.
- Con `canManageChecklist = false`: el checkbox SHALL renderizarse deshabilitado (solo lectura); el `label` NO SHALL ser editable; NO SHALL haber botón "Eliminar".

Todo el copy SHALL usar español neutral en segunda persona singular `tú` (ej. "Checklist", "Agrega un item", "Elimina"); NO SHALL usar voseo.

#### Scenario: Bloque oculto sin items ni capability

- **WHEN** un viewer abre una tarea con checklist vacío y `canManageChecklist = false`
- **THEN** el tab "Detalle" muestra la descripción pero NO renderiza el bloque "Checklist"

#### Scenario: Bloque con input de agregar para viewer con capability sin items

- **WHEN** un viewer con `canManageChecklist = true` abre una tarea con checklist vacío
- **THEN** el tab "Detalle" muestra el bloque "Checklist" con un input "+ agregar item" debajo del título

#### Scenario: Bloque solo-lectura para viewer sin capability

- **WHEN** un viewer con `canManageChecklist = false` abre una tarea que tiene tres items en su checklist
- **THEN** el bloque "Checklist" se renderiza con los tres items, checkboxes deshabilitados, sin edición inline ni botón eliminar, sin input "+ agregar item"

#### Scenario: Bloque interactivo para viewer con capability

- **WHEN** un viewer con `canManageChecklist = true` abre una tarea con dos items
- **THEN** el bloque "Checklist" muestra los dos items con checkboxes interactivos, labels editables al click, botones eliminar, y un input "+ agregar item" al final

#### Scenario: Click en checkbox dispara toggle

- **WHEN** un viewer con `canManageChecklist = true` hace click en el checkbox de un item destildado
- **THEN** la UI invoca `toggleChecklistItem(itemId, true)` y, al recibir éxito, refresca la fila con el item marcado

#### Scenario: Edición inline de label dispara update

- **WHEN** un viewer con `canManageChecklist = true` hace click en el `label` de un item, edita el texto y confirma (Enter o blur)
- **THEN** la UI invoca `updateChecklistItemLabel(itemId, nuevoLabel)` y, al recibir éxito, refresca la fila con el nuevo label

#### Scenario: Eliminar item dispara delete

- **WHEN** un viewer con `canManageChecklist = true` hace click en el botón "Eliminar" de un item
- **THEN** la UI invoca `deleteChecklistItem(itemId)` y, al recibir éxito, la fila desaparece del bloque

#### Scenario: Agregar item desde input

- **WHEN** un viewer con `canManageChecklist = true` escribe un label en el input "+ agregar item" y confirma (Enter)
- **THEN** la UI invoca `createChecklistItem(taskId, label)` y, al recibir éxito, el nuevo item aparece al final de la lista y el input queda listo para otro item

#### Scenario: Items mantienen orden createdAt ASC tras agregar

- **WHEN** un viewer agrega un item nuevo a una tarea con dos items previos
- **THEN** el nuevo item aparece al final (más reciente abajo); el orden no se altera al togglear ni al editar labels

#### Scenario: Label vacío en input no crea item

- **WHEN** un viewer con `canManageChecklist = true` confirma el input "+ agregar item" con texto vacío o solo espacios
- **THEN** la UI NO invoca la action y muestra un indicador discreto de validación o simplemente no hace nada

#### Scenario: Copy en español neutral

- **WHEN** se inspecciona el copy visible del bloque (título, input placeholder, botones, mensajes de error)
- **THEN** todas las cadenas usan formas neutras (`tú`, "Agrega", "Elimina", "Checklist") y NO contienen voseo (`Agregá`, `Eliminá`, `Ingresá`)

### Requirement: Sin paginación, sin reorder en v1

El sistema en v1 SHALL traer todos los items del checklist en una sola consulta junto con el detalle de la tarea, sin paginación. El sistema NO SHALL exponer reorder de items (drag-and-drop ni cambio de posición); el orden SHALL ser exclusivamente cronológico ascendente por `createdAt`. Si en el futuro emerge necesidad de reorder o paginación, una propuesta posterior SHALL agregarlas.

#### Scenario: Sin scroll virtualizado ni "cargar más"

- **WHEN** una tarea tiene N items (volumen razonable en v1)
- **THEN** los N items llegan en una sola respuesta del server component y se renderizan completos sin paginación

#### Scenario: Orden inmutable por createdAt

- **WHEN** un viewer crea, edita, marca o elimina items
- **THEN** la posición relativa entre items existentes NO cambia; solo cambia por inserción al final (nuevo item) o por eliminación de la fila correspondiente
