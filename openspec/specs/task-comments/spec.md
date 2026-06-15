# task-comments Specification

## Purpose

Comentarios sobre tareas con soft-delete. Define el modelo `TaskComment`, la autorización para comentar (igual a la regla de visibilidad de la tarea en `task-assignments`), la validación de contenido, la eliminación por autor con ventana de 60 minutos y por admin sin límite temporal, la lectura junto con el detalle de la tarea con `canDelete` precalculado server-side, la UI tipo chat al pie del detail pane, y la decisión de no paginar en v1.

## Requirements

### Requirement: Modelo `TaskComment`

El sistema SHALL exponer una entidad `TaskComment` persistida en Postgres en una tabla `task_comment` con los siguientes atributos: `id` (texto, PK), `taskId` (texto, FK a `task.id`, `ON DELETE CASCADE`, requerido), `authorId` (texto, FK a `user.id`, `ON DELETE CASCADE`, requerido), `body` (texto, requerido al crear), `createdAt` (timestamp con zona, asignado automáticamente), `deletedAt` (timestamp con zona, nullable), `deletedByName` (texto, nullable), `deletedByEmail` (texto, nullable). La tabla SHALL tener un índice sobre `(taskId, createdAt)` para soportar listados cronológicos por tarea. Los campos `deletedByName` y `deletedByEmail` SHALL ser snapshots del momento del borrado (no FK al `user` actual) para sobrevivir a borrados o renombres del usuario que eliminó.

#### Scenario: Crear comentario persiste createdAt automático
- **WHEN** se inserta un comentario sin proveer `createdAt`
- **THEN** `createdAt` se asigna al instante actual y `deletedAt`, `deletedByName`, `deletedByEmail` quedan en `NULL`

#### Scenario: Comentario se borra en cascada al borrar la tarea
- **WHEN** se elimina una tarea (vía `deleteTask` en draft)
- **THEN** todas las filas de `task_comment` con ese `taskId` se eliminan automáticamente

#### Scenario: Comentario se borra en cascada al borrar el usuario autor
- **WHEN** se elimina un `user` referenciado como `authorId` de uno o más comentarios
- **THEN** las filas correspondientes en `task_comment` se eliminan automáticamente

#### Scenario: Snapshot de eliminador sobrevive a borrado del eliminador
- **WHEN** un comentario fue eliminado por un admin y posteriormente ese admin se borra del sistema
- **THEN** `deletedByName` y `deletedByEmail` permanecen poblados en la fila del comentario

### Requirement: Autorización para comentar

El sistema SHALL permitir crear un comentario sobre una tarea si y solo si el invocador cumple la misma regla de visibilidad de la tarea definida en `task-assignments`. Es decir: `admin`/`owner` de la organización de la tarea pueden comentar siempre (incluso en `draft` y `archived`); el `member` puede comentar si la tarea tiene `visibility = 'active'` Y es `authorId`, `responsibleId` o existe en `task_assignee`. Usuarios sin organización activa o fuera de la organización de la tarea SHALL recibir error de autorización.

#### Scenario: Admin comenta tarea active
- **WHEN** un admin invoca `createComment` sobre una tarea de su organización con `visibility = "active"`
- **THEN** el comentario se persiste con `authorId` igual al invocador

#### Scenario: Admin comenta tarea draft
- **WHEN** un admin invoca `createComment` sobre una tarea con `visibility = "draft"`
- **THEN** el comentario se persiste

#### Scenario: Admin comenta tarea archived
- **WHEN** un admin invoca `createComment` sobre una tarea con `visibility = "archived"`
- **THEN** el comentario se persiste

#### Scenario: Responsable member comenta su tarea active
- **WHEN** un `member` con `responsibleId = me` invoca `createComment` sobre esa tarea
- **THEN** el comentario se persiste

#### Scenario: Assignee member comenta su tarea active
- **WHEN** un `member` presente en `task_assignee` invoca `createComment` sobre esa tarea
- **THEN** el comentario se persiste

#### Scenario: Autor member comenta su tarea active
- **WHEN** un `member` que es `authorId` invoca `createComment` sobre su tarea con `visibility = "active"`
- **THEN** el comentario se persiste

#### Scenario: Member NO comenta tarea draft donde participa
- **WHEN** un `member` que es responsable o assignee invoca `createComment` sobre una tarea con `visibility = "draft"`
- **THEN** la operación falla con error de autorización

#### Scenario: Member NO comenta tarea archived
- **WHEN** un `member` que participaba en una tarea ahora `archived` invoca `createComment`
- **THEN** la operación falla con error de autorización

#### Scenario: Member NO comenta tarea donde no participa
- **WHEN** un `member` que NO es autor, responsable ni assignee invoca `createComment` sobre una tarea active de su org
- **THEN** la operación falla con error de autorización

#### Scenario: Usuario fuera de la org NO comenta
- **WHEN** un usuario sin membresía en la organización de la tarea invoca `createComment`
- **THEN** la operación falla con error de autorización

### Requirement: Validación de contenido al comentar

El sistema SHALL validar en la server action que el `body` del comentario, una vez aplicado `trim`, NO sea cadena vacía. SHALL aplicar un máximo de 2000 caracteres sobre el `body` ya trimeado. El `body` SHALL persistirse como texto plano; no se interpreta ni renderiza markdown ni HTML.

#### Scenario: Body vacío rechazado
- **WHEN** un invocador autorizado invoca `createComment` con `body = ""` o `body` que solo contiene espacios/saltos de línea
- **THEN** la acción falla con error de validación indicando que el comentario está vacío

#### Scenario: Body excede el máximo rechazado
- **WHEN** un invocador autorizado invoca `createComment` con un `body` trimeado de longitud mayor a 2000 caracteres
- **THEN** la acción falla con error de validación

#### Scenario: Body con espacios al final se trimea
- **WHEN** un invocador autorizado invoca `createComment` con `body = "  hola  "`
- **THEN** el comentario se persiste con `body = "hola"`

### Requirement: Eliminación por el autor con ventana de 60 minutos

El sistema SHALL permitir al `authorId` de un comentario invocar `deleteComment` sobre su propio comentario si y solo si `now() - comment.createdAt < 60 minutos` evaluado en el servidor al momento de la acción. La operación SHALL ser un soft-delete: NO se borra la fila; se persiste `deletedAt = now()`, `deletedByName = author.name`, `deletedByEmail = author.email`. El `body` original SHALL conservarse en DB. La operación SHALL ser idempotente sobre un comentario ya eliminado (retorna éxito sin cambios). Tras los 60 minutos, el autor (no admin) SHALL recibir error de autorización al intentar borrar su comentario.

#### Scenario: Autor borra dentro de la ventana
- **WHEN** el `authorId` del comentario invoca `deleteComment` 30 minutos después de `createdAt`
- **THEN** `deletedAt` queda con el instante actual, `deletedByName` y `deletedByEmail` quedan con los datos del autor, y `body` permanece intacto en DB

#### Scenario: Autor NO borra fuera de la ventana
- **WHEN** el `authorId` del comentario (que NO es admin/owner) invoca `deleteComment` 61 minutos después de `createdAt`
- **THEN** la operación falla con error de autorización y `deletedAt` permanece `NULL`

#### Scenario: Borrado idempotente sobre comentario ya eliminado
- **WHEN** el `authorId` invoca `deleteComment` sobre un comentario que ya está soft-deleted
- **THEN** la operación retorna éxito sin modificar `deletedAt`, `deletedByName` ni `deletedByEmail`

### Requirement: Eliminación por admin/owner sin límite temporal

El sistema SHALL permitir a cualquier `admin` u `owner` de la organización de la tarea invocar `deleteComment` sobre cualquier comentario de esa tarea SIN restricción temporal. La operación SHALL ser un soft-delete con `deletedAt = now()`, `deletedByName = admin.name`, `deletedByEmail = admin.email`, conservando `body`. Si el admin elimina su propio comentario, aplica esta regla (no la del autor): no hay límite de 60 minutos para el admin.

#### Scenario: Admin borra comentario ajeno reciente
- **WHEN** un admin invoca `deleteComment` sobre un comentario de otro usuario creado hace 5 minutos
- **THEN** el comentario queda soft-deleted con snapshot del admin como eliminador

#### Scenario: Admin borra comentario ajeno antiguo
- **WHEN** un admin invoca `deleteComment` sobre un comentario de otro usuario creado hace 3 días
- **THEN** el comentario queda soft-deleted con snapshot del admin como eliminador

#### Scenario: Admin borra su propio comentario después de 60 min
- **WHEN** un admin invoca `deleteComment` sobre su propio comentario creado hace 2 horas
- **THEN** el comentario queda soft-deleted (la regla de 60 min NO aplica a admin)

#### Scenario: Member NO admin NO puede borrar comentarios ajenos
- **WHEN** un `member` regular (responsable o assignee de la tarea, no admin) invoca `deleteComment` sobre un comentario ajeno
- **THEN** la operación falla con error de autorización

### Requirement: Lectura de comentarios con el detalle de la tarea

El sistema SHALL incluir los comentarios de una tarea al cargar su detalle en el server component, evitando un round-trip adicional. La consulta SHALL devolver los comentarios ordenados por `createdAt ASC` con join a `user` (autor) para obtener nombre, email y avatar. La consulta SHALL precalcular por cada comentario un campo `canDelete: boolean` proyectado al cliente, equivalente a: `(viewer.id === comment.authorId AND now - createdAt < 60 min) OR viewer.role IN ('admin','owner')`. La identidad del viewer NO SHALL viajar al cliente; solo el booleano `canDelete` por fila. Los comentarios con `deletedAt != NULL` SHALL incluirse en la respuesta pero con `body` reemplazado por `null` en el payload al cliente para que el `body` original NO viaje al frontend.

#### Scenario: Detalle de tarea incluye comentarios cronológicos
- **WHEN** un viewer autorizado abre el detalle de una tarea con varios comentarios
- **THEN** la respuesta del server component incluye la lista de comentarios ordenados por `createdAt ASC` con autor, body, createdAt y canDelete por fila

#### Scenario: canDelete true para autor reciente
- **WHEN** el viewer es el `authorId` de un comentario creado hace 10 minutos y NO es admin
- **THEN** ese comentario llega al cliente con `canDelete = true`

#### Scenario: canDelete false para autor fuera de ventana
- **WHEN** el viewer es el `authorId` de un comentario creado hace 61 minutos y NO es admin
- **THEN** ese comentario llega al cliente con `canDelete = false`

#### Scenario: canDelete true para admin sobre comentario ajeno
- **WHEN** el viewer es admin/owner y consulta el detalle de una tarea con comentarios de otros usuarios
- **THEN** todos los comentarios llegan con `canDelete = true`

#### Scenario: Body de comentario eliminado NO viaja al cliente
- **WHEN** el viewer abre el detalle de una tarea con un comentario soft-deleted
- **THEN** la fila del comentario llega al cliente con `body = null` y los campos `deletedAt`, `deletedByName` y `deletedByEmail` poblados

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

### Requirement: Sin paginación en v1

El sistema en v1 SHALL traer todos los comentarios de la tarea en una sola consulta, sin paginación. Cuando el volumen de comentarios por tarea crezca al punto de afectar performance, una propuesta futura SHALL agregar paginación; este alcance queda fuera de esta capability.

#### Scenario: Todos los comentarios viajan en una sola respuesta
- **WHEN** un viewer abre una tarea con N comentarios (N razonable en v1)
- **THEN** los N comentarios llegan en la misma respuesta del server component, sin scroll virtualizado ni "cargar más"

### Requirement: Gate de vencimiento sobre eliminación de comentario propio

El sistema SHALL aplicar el gate de vencimiento de la tarea contenedora sobre la acción de eliminar un comentario propio dentro de la ventana de 60 minutos. Cuando la tarea contenedora está vencida (según el requirement "Estado de vencimiento derivado" en `task-assignments`):

- Un `member` regular que NO sea autor de la tarea SHALL perder la capacidad de eliminar su propio comentario aunque esté dentro de la ventana de 60 minutos.
- El `admin`/`owner` SHALL poder seguir eliminando comentarios (suyos o ajenos) sin gate de vencimiento (su capacidad de borrado sin límite temporal queda intacta).
- El `member` regular que sea `authorId` de la tarea SHALL poder seguir eliminando su propio comentario dentro de la ventana de 60 minutos al vencer.

La creación de comentarios (`createComment`) NO SHALL ser afectada por el gate de vencimiento: cualquier viewer con visibilidad sobre la tarea puede comentar siempre. Comentar es la única acción de coordinación que sobrevive al vencimiento intencionalmente.

El flag `canDelete` proyectado por fila de comentario al cliente SHALL reflejar el gate: para un comentario cuyo `authorId` es un `member` regular no-autor-de-la-tarea, sobre una tarea active vencida, el flag SHALL ser `false` aunque el comentario esté dentro de la ventana de 60 minutos.

La UI SHALL leer este flag para mostrar/ocultar el botón de eliminar comentario propio. La UI NO SHALL inspeccionar `task.dueAt` para esta decisión.

#### Scenario: Crear comentario sigue habilitado al vencer
- **WHEN** un `member` regular que es `responsibleId` invoca `createComment` con `body` válido sobre una tarea active vencida
- **THEN** el comentario se persiste

#### Scenario: Responsable member no elimina su comentario en tarea vencida
- **WHEN** un `member` regular que es `responsibleId` (no autor, no admin) intenta eliminar un comentario propio creado hace 5 minutos sobre una tarea active vencida
- **THEN** la operación falla con error de autorización y el comentario permanece

#### Scenario: Assignee member no elimina su comentario en tarea vencida
- **WHEN** un `member` regular presente en `task_assignee` (no autor, no admin) intenta eliminar un comentario propio creado hace 30 minutos sobre una tarea active vencida
- **THEN** la operación falla con error de autorización

#### Scenario: Autor member elimina su comentario en su tarea vencida
- **WHEN** un `member` regular que es `authorId` intenta eliminar un comentario propio creado hace 10 minutos sobre su tarea active vencida
- **THEN** el comentario se elimina (soft-delete con `deletedAt`, `deletedByName`, `deletedByEmail` poblados)

#### Scenario: Admin elimina comentario ajeno en tarea vencida
- **WHEN** un admin invoca la eliminación de un comentario ajeno (sin límite temporal) sobre una tarea active vencida
- **THEN** el comentario queda soft-deleted

#### Scenario: Ventana de 60 minutos respetada en tarea no vencida
- **WHEN** un `member` regular que es `responsibleId` intenta eliminar un comentario propio sobre una tarea active no vencida, dentro de los 60 minutos
- **THEN** el comentario queda soft-deleted (regla previa intacta)

#### Scenario: canDelete por comentario refleja gate de vencimiento
- **WHEN** se proyecta `canDelete` para un comentario cuyo `authorId` es un `member` regular no-autor-de-la-tarea, sobre una tarea active vencida, dentro de la ventana de 60 minutos
- **THEN** el flag queda `false`

#### Scenario: canDelete admin intacto al vencer
- **WHEN** se proyecta `canDelete` para cualquier comentario, sobre una tarea active vencida, con viewer admin
- **THEN** el flag queda `true`
