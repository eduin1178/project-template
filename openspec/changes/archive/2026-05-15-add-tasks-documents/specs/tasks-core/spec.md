## MODIFIED Requirements

### Requirement: Eliminar tarea en draft

El sistema SHALL exponer una acción `deleteTask` que elimina físicamente una tarea (incluyendo sus filas en `task_assignee`, `task_comment` y `task_document` vía `ON DELETE CASCADE`). La acción SHALL permitirse SÓLO si la tarea tiene `visibility = 'draft'` Y el invocador es el `authorId` de la tarea O es `admin`/`owner` de la organización de la tarea. La eliminación es física e irreversible.

Antes de ejecutar el `DELETE FROM task ...`, la acción SHALL leer todos los `task_document.storageKey` asociados al `taskId` e invocar `deletePrivateAsset` por cada uno usando `Promise.allSettled` (best-effort, en paralelo). Si una o más eliminaciones en R2 fallan, la acción SHALL loggear un warning con los keys afectados pero NO SHALL abortar el borrado de la tarea: el operador ya solicitó eliminar la tarea y un blob huérfano en R2 no es razón para frustrar la operación. Tras la limpieza best-effort, la acción SHALL ejecutar el `DELETE FROM task` y la cascada eliminará las filas de `task_document`.

#### Scenario: Autor elimina su draft sin documentos

- **WHEN** el `authorId` invoca `deleteTask` sobre una tarea propia con `visibility = "draft"` que no tiene documentos
- **THEN** la tarea se elimina de `task` y sus filas en `task_assignee` y `task_comment` se eliminan en cascada; no se invoca `deletePrivateAsset` porque no hay documentos

#### Scenario: Admin elimina draft ajeno con documentos

- **WHEN** un admin B invoca `deleteTask` sobre una tarea con `visibility = "draft"`, `authorId = A` y dos documentos asociados
- **THEN** se invoca `deletePrivateAsset` por cada `storageKey` antes del DELETE; la tarea se elimina y las filas `task_document` se eliminan por la FK CASCADE

#### Scenario: Falla en R2 no bloquea el borrado de la tarea

- **WHEN** se invoca `deleteTask` sobre una tarea draft con tres documentos y `deletePrivateAsset` falla para uno de ellos
- **THEN** el fallo se loggea con el `storageKey` afectado, la tarea se elimina igual y las filas `task_document` se eliminan por la cascada (el blob huérfano queda en R2)

#### Scenario: No se puede eliminar tarea active

- **WHEN** cualquier usuario invoca `deleteTask` sobre una tarea con `visibility = "active"`
- **THEN** la operación falla con error de validación y la tarea permanece (no se tocan ni `task_document` ni R2)

#### Scenario: No se puede eliminar tarea archived

- **WHEN** cualquier usuario invoca `deleteTask` sobre una tarea con `visibility = "archived"`
- **THEN** la operación falla con error de validación y la tarea permanece

#### Scenario: Member no autor no puede eliminar

- **WHEN** un `member` regular que NO es el autor invoca `deleteTask` sobre una tarea en `draft`
- **THEN** la operación falla con error de autorización
