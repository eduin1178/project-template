## ADDED Requirements

### Requirement: UI de edición de tarea desde el detalle

El sistema SHALL exponer en el detail pane de una tarea un control "Editar" que abre un diálogo (`EditTaskDialog`) con campos para `title`, `description` y `dueAt`. El diálogo SHALL invocar la server action `updateTaskContent` ya existente; el servidor sigue siendo la fuente de verdad de las reglas (autor en draft o admin/owner para contenido; admin/owner y NO archived para `dueAt`).

El diálogo SHALL renderizar sus campos según las capabilities del viewer:

- El botón "Editar" SHALL aparecer si y solo si el viewer tiene capability `canEditContent` O `canEditDueAt` sobre la tarea.
- Los campos `title` y `description` SHALL estar habilitados si `canEditContent`; deshabilitados en caso contrario.
- El campo `dueAt` SHALL estar VISIBLE si `canEditDueAt`; OCULTO en caso contrario (no solo deshabilitado, porque en archived el campo no aplica).
- El diálogo NO SHALL exponer campos para `visibility`, `status`, `responsibleId`, `authorId` ni `assignees`; esos flujos viven en otros controles del detail pane.

El campo `description` del diálogo de edición y del diálogo de creación (`CreateTaskDialog`) SHALL usar un `<Textarea>` con altura mínima ampliada (no menos de 8 filas visibles) y SHALL permitir redimensionado vertical por el usuario, con tope de altura máxima razonable para no romper el layout del diálogo.

Al cerrar el diálogo tras un guardado exitoso, la UI SHALL refrescar la vista para mostrar los valores actualizados.

#### Scenario: Admin abre y guarda edición de título y descripción
- **WHEN** un admin selecciona una tarea con `visibility = "active"`, abre el diálogo "Editar", modifica `title` y `description`, y confirma
- **THEN** la server action `updateTaskContent` se invoca con los nuevos valores y, al recibir éxito, el detail pane refleja los cambios

#### Scenario: Admin edita dueAt en draft
- **WHEN** un admin abre el diálogo "Editar" sobre una tarea en `draft` y modifica `dueAt`
- **THEN** el campo `dueAt` es visible, la action se invoca con el nuevo `dueAt` y el cambio se refleja

#### Scenario: Admin NO ve campo dueAt en archived
- **WHEN** un admin abre el diálogo "Editar" sobre una tarea con `visibility = "archived"`
- **THEN** el campo `dueAt` NO está presente en el formulario (oculto, no deshabilitado)

#### Scenario: Autor (no admin) edita su draft desde el dialog
- **WHEN** el `authorId` (member regular) de una tarea en `draft` abre el diálogo "Editar"
- **THEN** los campos `title` y `description` están habilitados, el campo `dueAt` NO se muestra, y al confirmar la action se invoca y el cambio se persiste

#### Scenario: Autor (no admin) NO ve botón Editar en tarea active propia
- **WHEN** un `member` que es `authorId` de una tarea con `visibility = "active"` abre el detail pane
- **THEN** el botón "Editar" NO se muestra (no tiene `canEditContent` ni `canEditDueAt`)

#### Scenario: Member sin autoría NO ve botón Editar
- **WHEN** un `member` regular (no autor, no admin) que es responsable o assignee abre el detail pane
- **THEN** el botón "Editar" NO se muestra

#### Scenario: Botón Editar oculto si no hay capabilities aplicables
- **WHEN** el viewer no tiene ni `canEditContent` ni `canEditDueAt` sobre la tarea seleccionada
- **THEN** el botón "Editar" NO aparece en el detail pane

#### Scenario: Textarea de descripción ampliado en creación
- **WHEN** un admin abre `CreateTaskDialog`
- **THEN** el `<Textarea>` de descripción se renderiza con altura mínima equivalente a al menos 8 filas y permite redimensionado vertical

#### Scenario: Textarea de descripción ampliado en edición
- **WHEN** un admin u autor abre `EditTaskDialog`
- **THEN** el `<Textarea>` de descripción se renderiza con la misma altura mínima y redimensionado vertical que en creación

#### Scenario: Copy en español neutral
- **WHEN** se inspecciona el copy del diálogo de edición (label de botón, título del diálogo, labels de campos, mensajes de error)
- **THEN** todas las cadenas usan formas neutras (`tú`, "Edita", "Guarda", "Cierra") y NO contienen voseo

### Requirement: Scroll de descripción en el detail pane

El sistema SHALL renderizar el contenido de `description` en el detail pane dentro de un contenedor con `overflow-y-auto` propio, de modo que descripciones largas scrolleen DENTRO del bloque de descripción mientras el header del detail pane (título, badges de visibility/status y la barra de acciones) permanece visible en la parte superior del panel.

#### Scenario: Descripción larga scrollea sin perder header
- **WHEN** una tarea con descripción de varios párrafos se selecciona en el detail pane
- **THEN** el usuario puede scrollear hacia abajo dentro del bloque de descripción y el header con título, badges y barra de acciones sigue visible en la parte superior

#### Scenario: Descripción corta no muestra scroll
- **WHEN** una tarea con descripción breve (cabe en una pantalla) se selecciona en el detail pane
- **THEN** el bloque de descripción NO muestra barra de scroll visible
