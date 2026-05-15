## ADDED Requirements

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
