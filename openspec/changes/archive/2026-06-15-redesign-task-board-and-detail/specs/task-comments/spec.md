## MODIFIED Requirements

### Requirement: UI tipo chat al pie del detail pane
El sistema SHALL renderizar los comentarios en un panel `TaskCommentsPanel` dentro del detalle full-page. En desktop amplio, el panel SHALL poder ocupar una columna secundaria persistente a la derecha del contenido principal; en tablet y mobile, SHALL renderizarse como una sección vertical después de descripción, checklist y documentos. El panel SHALL estar disponible para cualquier viewer que tenga acceso al detalle de la tarea; la regla de visibilidad ya filtra el acceso.

El panel SHALL listar los comentarios cronológicamente ASC; cada fila SHALL mostrar avatar del autor, nombre del autor, timestamp relativo y body. Los comentarios con `deletedAt != NULL` SHALL renderizarse con un placeholder en lugar del body:

- Si `deletedByEmail` coincide con el email del autor del comentario, el placeholder SHALL ser exactamente: `Comentario eliminado por el autor.`
- En caso contrario, el placeholder SHALL ser exactamente: `Comentario eliminado por {deletedByName}.`

El panel SHALL incluir un composer con `<Textarea>` multilínea y botón `Enviar`. El composer SHALL invocar `createComment` y, al recibir éxito, limpiar el textarea y refrescar la lista. Presionar Enter en el textarea SHALL enviar; presionar Shift+Enter SHALL insertar un salto de línea. El composer SHALL ocultarse si `canComment` es false. El botón `Eliminar` de cada comentario SHALL renderizarse si y solo si `canDelete` proyectado para esa fila es true; al hacer click SHALL invocar `deleteComment(commentId)` y refrescar la lista. Todo el copy SHALL estar en español neutral en segunda persona singular `tú`, sin voseo.

#### Scenario: Panel de comentarios visible en detalle full-page
- **WHEN** un viewer autorizado abre `/tasks/<id>` o `/admin/tasks/<id>`
- **THEN** el panel de comentarios se renderiza dentro del detalle full-page

#### Scenario: Comentarios laterales en desktop amplio
- **WHEN** un viewer abre el detalle en desktop amplio
- **THEN** el panel de comentarios se muestra como columna secundaria o panel lateral persistente cuando el espacio lo permite

#### Scenario: Comentarios verticales en mobile
- **WHEN** un viewer abre el detalle en mobile
- **THEN** el panel de comentarios aparece como sección vertical legible dentro del flujo de la página

#### Scenario: Comentarios ordenados cronológicamente ASC
- **WHEN** una tarea tiene varios comentarios
- **THEN** la lista los muestra del más antiguo al más reciente, con timestamps relativos

#### Scenario: Composer envía con Enter
- **WHEN** el viewer escribe en el textarea y presiona Enter
- **THEN** se invoca `createComment` con el contenido trimeado; al recibir éxito, el textarea se limpia y la lista se refresca con el nuevo comentario al final

#### Scenario: Composer inserta salto con Shift+Enter
- **WHEN** el viewer escribe en el textarea y presiona Shift+Enter
- **THEN** se inserta un salto de línea en el textarea y NO se invoca `createComment`

#### Scenario: Botón Eliminar visible solo si canDelete
- **WHEN** un comentario llega con `canDelete = true`
- **THEN** el botón `Eliminar` aparece en esa fila

#### Scenario: Botón Eliminar oculto si canDelete false
- **WHEN** un comentario llega con `canDelete = false`
- **THEN** el botón `Eliminar` NO aparece en esa fila

#### Scenario: Render de comentario eliminado por el autor
- **WHEN** un comentario tiene `deletedAt != NULL` y `deletedByEmail` igual al email del autor
- **THEN** la fila renderiza el texto exacto `Comentario eliminado por el autor.` en lugar del body, conservando avatar y timestamp original

#### Scenario: Render de comentario eliminado por admin moderador
- **WHEN** un comentario tiene `deletedAt != NULL` y `deletedByEmail` distinto del email del autor
- **THEN** la fila renderiza el texto exacto `Comentario eliminado por {deletedByName}.` con el nombre del admin que eliminó

#### Scenario: Borrado por desfase de ventana muestra error
- **WHEN** el autor del comentario hace click en `Eliminar` y la action llega al servidor cuando ya pasaron 60 minutos
- **THEN** la action retorna error de autorización y la UI muestra un mensaje claro indicando que la ventana de eliminación expiró

#### Scenario: Composer oculto si canComment false
- **WHEN** el viewer no tiene capability `canComment` sobre la tarea
- **THEN** el composer no se renderiza en el panel y el viewer solo lee la lista

#### Scenario: Copy en español neutral
- **WHEN** se inspecciona el copy visible del panel de comentarios
- **THEN** todas las cadenas usan formas neutras (`tú`, `Comenta`, `Envía`, `Elimina`) y NO contienen voseo (`Comentá`, `Enviá`, `Eliminá`)
