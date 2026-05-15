## ADDED Requirements

### Requirement: Gate de vencimiento sobre upload y eliminación de documento propio

El sistema SHALL aplicar el gate de vencimiento de la tarea contenedora sobre la server action `uploadTaskDocument` y sobre la server action de eliminación de documento. Cuando la tarea contenedora está vencida (según el requirement "Estado de vencimiento derivado" en `task-assignments`):

- `uploadTaskDocument` SHALL rechazar la subida si el invocador NO pasa `canActOnExpired(viewer, task)`.
- La eliminación de un documento SHALL rechazarse para el `uploaderId` member regular no-autor de la tarea. Admin/owner SHALL poder seguir eliminando documentos (suyos o ajenos) sin gate de vencimiento. El autor de la tarea SHALL poder seguir eliminando sus propios documentos al vencer.

La descarga vía URL firmada NO SHALL ser afectada por el vencimiento: cualquier viewer con visibilidad sobre la tarea puede descargar documentos independientemente del estado de `dueAt`. El gate aplica solo a operaciones de mutación.

Las capabilities proyectadas SHALL reflejar el gate:
- `canUploadDocument` (a nivel tarea): `false` para member regular no-autor cuando la tarea está vencida.
- `canDelete` (proyectado por fila de documento al cliente): cuando la tarea está vencida y el viewer es member regular no-autor, el flag SHALL ser `false` aunque el viewer sea el `uploaderId` del documento.

La UI SHALL leer estos flags para decidir habilitar/ocultar el input de upload y el botón de eliminar por fila. La UI NO SHALL inspeccionar `task.dueAt` para tomar estas decisiones.

#### Scenario: Admin sube documento en tarea vencida
- **WHEN** un admin invoca `uploadTaskDocument` con un archivo válido sobre una tarea active vencida
- **THEN** el documento se persiste y se sube a R2

#### Scenario: Autor member sube documento en su tarea vencida
- **WHEN** un `member` regular que es `authorId` invoca `uploadTaskDocument` sobre su tarea active vencida
- **THEN** el documento se persiste

#### Scenario: Responsable member no sube documento en tarea vencida
- **WHEN** un `member` regular que es `responsibleId` (no autor, no admin) invoca `uploadTaskDocument` sobre una tarea active vencida
- **THEN** la operación falla con error de autorización y nada se persiste (ni en DB ni en R2)

#### Scenario: Assignee member no sube documento en tarea vencida
- **WHEN** un `member` regular presente en `task_assignee` (no autor, no admin) invoca `uploadTaskDocument` sobre una tarea active vencida
- **THEN** la operación falla con error de autorización

#### Scenario: Responsable member no elimina su documento en tarea vencida
- **WHEN** un `member` regular que es `responsibleId` (no autor, no admin) y es el `uploaderId` de un documento invoca la acción de eliminar sobre una tarea active vencida
- **THEN** la operación falla con error de autorización y el documento permanece

#### Scenario: Autor member elimina su documento en su tarea vencida
- **WHEN** un `member` regular que es `authorId` y es el `uploaderId` de un documento invoca la acción de eliminar sobre su tarea active vencida
- **THEN** el documento se elimina (DB + R2)

#### Scenario: Admin elimina documento ajeno en tarea vencida
- **WHEN** un admin invoca la acción de eliminar sobre un documento del que NO es `uploaderId`, en una tarea active vencida
- **THEN** el documento se elimina

#### Scenario: Descarga sigue habilitada al vencer
- **WHEN** un `member` regular que es `responsibleId` o assignee solicita la URL firmada de descarga de un documento de una tarea active vencida
- **THEN** la URL se entrega y la descarga procede normalmente

#### Scenario: canUploadDocument refleja gate de vencimiento
- **WHEN** se proyecta `canUploadDocument` para un `member` regular no-autor sobre una tarea active vencida
- **THEN** la capability queda `false`

#### Scenario: canDelete por fila refleja gate de vencimiento
- **WHEN** se proyecta `canDelete` para un documento cuyo `uploaderId` es un `member` regular no-autor, sobre una tarea active vencida
- **THEN** el flag queda `false` aunque el viewer sea el uploader
