## MODIFIED Requirements

### Requirement: UI inline del checklist en el tab `Detalle`
El sistema SHALL renderizar el bloque `TaskChecklistPanel` como una sección visible del detalle full-page de la tarea, ubicado debajo del bloque de descripción en la columna principal. Aunque el nombre histórico del requirement menciona el tab `Detalle`, la nueva presentación ya no SHALL requerir un tab para acceder al checklist.

El render del bloque SHALL ser condicional según el estado del checklist y la capability:

- Si NO hay items Y `canManageChecklist = false`: el bloque NO SHALL renderizarse o SHALL mostrarse como estado vacío mínimo solo si el diseño necesita balance visual; no debe introducir ruido operativo.
- Si NO hay items Y `canManageChecklist = true`: el bloque SHALL renderizarse con título `Checklist` y un input `Agrega un item` o equivalente.
- Si hay items: el bloque SHALL renderizarse con título `Checklist`, la lista de items en orden `createdAt ASC`, y si `canManageChecklist = true`, un input para agregar item al final.

Cada fila de item SHALL mostrar un checkbox y el `label`. El comportamiento por fila depende de `canManageChecklist`:

- Con `canManageChecklist = true`: el checkbox SHALL ser interactivo; click en el `label` SHALL habilitar edición inline; un botón `Eliminar` SHALL estar disponible sin depender exclusivamente de hover en pantallas táctiles.
- Con `canManageChecklist = false`: el checkbox SHALL renderizarse deshabilitado; el `label` NO SHALL ser editable; NO SHALL haber botón `Eliminar`.

Todo el copy SHALL usar español neutral en segunda persona singular `tú` (ej. `Checklist`, `Agrega un item`, `Elimina`); NO SHALL usar voseo.

#### Scenario: Bloque oculto sin items ni capability
- **WHEN** un viewer abre una tarea con checklist vacío y `canManageChecklist = false`
- **THEN** el detalle muestra la descripción y no introduce controles de checklist accionables

#### Scenario: Bloque con input de agregar para viewer con capability sin items
- **WHEN** un viewer con `canManageChecklist = true` abre una tarea con checklist vacío
- **THEN** el detalle muestra el bloque `Checklist` con un input para agregar item

#### Scenario: Bloque solo-lectura para viewer sin capability
- **WHEN** un viewer con `canManageChecklist = false` abre una tarea que tiene tres items en su checklist
- **THEN** el bloque `Checklist` se renderiza con los tres items, checkboxes deshabilitados, sin edición inline ni botón eliminar, sin input para agregar item

#### Scenario: Bloque interactivo para viewer con capability
- **WHEN** un viewer con `canManageChecklist = true` abre una tarea con dos items
- **THEN** el bloque `Checklist` muestra los dos items con checkboxes interactivos, labels editables, botones eliminar y un input para agregar item

#### Scenario: Click en checkbox dispara toggle
- **WHEN** un viewer con `canManageChecklist = true` hace click en el checkbox de un item destildado
- **THEN** la UI invoca `toggleChecklistItem(itemId, true)` y, al recibir éxito, refresca la fila con el item marcado

#### Scenario: Edición inline de label dispara update
- **WHEN** un viewer con `canManageChecklist = true` hace click en el `label` de un item, edita el texto y confirma
- **THEN** la UI invoca `updateChecklistItemLabel(itemId, nuevoLabel)` y, al recibir éxito, refresca la fila con el nuevo label

#### Scenario: Eliminar item dispara delete
- **WHEN** un viewer con `canManageChecklist = true` hace click en el botón `Eliminar` de un item
- **THEN** la UI invoca `deleteChecklistItem(itemId)` y, al recibir éxito, la fila desaparece del bloque

#### Scenario: Agregar item desde input
- **WHEN** un viewer con `canManageChecklist = true` escribe un label en el input de agregar item y confirma
- **THEN** la UI invoca `createChecklistItem(taskId, label)` y, al recibir éxito, el nuevo item aparece al final de la lista

#### Scenario: Items mantienen orden createdAt ASC tras agregar
- **WHEN** un viewer agrega un item nuevo a una tarea con dos items previos
- **THEN** el nuevo item aparece al final y el orden no se altera al togglear ni al editar labels

#### Scenario: Label vacío en input no crea item
- **WHEN** un viewer con `canManageChecklist = true` confirma el input con texto vacío o solo espacios
- **THEN** la UI NO invoca la action y muestra validación discreta o no hace nada

#### Scenario: Copy en español neutral
- **WHEN** se inspecciona el copy visible del bloque
- **THEN** todas las cadenas usan formas neutras (`tú`, `Agrega`, `Elimina`, `Checklist`) y NO contienen voseo (`Agregá`, `Eliminá`, `Ingresá`)
