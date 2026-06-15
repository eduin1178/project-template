## MODIFIED Requirements

### Requirement: UI inline del checklist en el tab `Detalle`
El sistema SHALL renderizar el bloque `TaskChecklistPanel` dentro de un tab `Checklist` ubicado debajo del bloque de descripción en la columna principal del detalle full-page. El label del tab SHALL incluir el conteo de items del checklist. El contenido del checklist SHALL mostrarse solo cuando su tab esté activo.

El render del contenido del tab SHALL ser condicional según el estado del checklist y la capability:

- Si NO hay items Y `canManageChecklist = false`: el tab SHALL mostrar un estado vacío mínimo sin controles accionables.
- Si NO hay items Y `canManageChecklist = true`: el tab SHALL renderizar el título `Checklist` y un input `Agrega un item` o equivalente.
- Si hay items: el tab SHALL renderizar la lista de items en orden `createdAt ASC`, y si `canManageChecklist = true`, un input para agregar item al final.

Cada fila de item SHALL mostrar un checkbox y el `label`. El comportamiento por fila depende de `canManageChecklist`:

- Con `canManageChecklist = true`: el checkbox SHALL ser interactivo; click en el `label` SHALL habilitar edición inline; un botón `Eliminar` SHALL estar disponible sin depender exclusivamente de hover en pantallas táctiles.
- Con `canManageChecklist = false`: el checkbox SHALL renderizarse deshabilitado; el `label` NO SHALL ser editable; NO SHALL haber botón `Eliminar`.

Todo el copy SHALL usar español neutral en segunda persona singular `tú` (ej. `Checklist`, `Agrega un item`, `Elimina`); NO SHALL usar voseo.

#### Scenario: Checklist accesible desde su tab
- **WHEN** un viewer abre el detalle y selecciona el tab `Checklist`
- **THEN** el tab muestra el contenido del checklist según la capability del viewer

#### Scenario: Tab con input de agregar para viewer con capability sin items
- **WHEN** un viewer con `canManageChecklist = true` abre el tab `Checklist` de una tarea con checklist vacío
- **THEN** el tab muestra el título `Checklist` con un input para agregar item

#### Scenario: Tab solo-lectura para viewer sin capability
- **WHEN** un viewer con `canManageChecklist = false` abre el tab `Checklist` de una tarea que tiene tres items
- **THEN** el tab se renderiza con los tres items, checkboxes deshabilitados, sin edición inline ni botón eliminar, sin input para agregar item

#### Scenario: Tab interactivo para viewer con capability
- **WHEN** un viewer con `canManageChecklist = true` abre el tab `Checklist` de una tarea con dos items
- **THEN** el tab muestra los dos items con checkboxes interactivos, labels editables, botones eliminar y un input para agregar item
