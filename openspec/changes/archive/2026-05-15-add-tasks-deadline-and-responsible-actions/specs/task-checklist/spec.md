## ADDED Requirements

### Requirement: Gate de vencimiento sobre mutación de checklist

El sistema SHALL aplicar el gate de vencimiento de la tarea contenedora sobre las cuatro server actions de mutación del checklist (`createChecklistItem`, `updateChecklistItemLabel`, `toggleChecklistItem`, `deleteChecklistItem`). Cuando la tarea contenedora está vencida (según el requirement "Estado de vencimiento derivado" en `task-assignments`), las cuatro acciones SHALL rechazar la operación si el invocador NO pasa `canActOnExpired(viewer, task)` (definida en `task-assignments`).

En términos concretos:
- `admin`/`owner` y el `authorId` de la tarea SHALL poder seguir mutando el checklist aunque la tarea esté vencida.
- `member` regular que sea `responsibleId` o assignee SHALL perder la capacidad de mutar el checklist cuando la tarea está vencida.

La capability proyectada `canManageChecklist` SHALL reflejar este gate: para member regular no-autor, queda `false` cuando la tarea está vencida. La UI SHALL renderizar el panel en modo solo-lectura en ese caso (mismo modo que ya usa cuando el viewer no tiene la capability).

El gate de vencimiento se compone CON la matriz de autorización por `visibility` existente; las dos reglas se aplican en conjunto. Una tarea archivada sigue rechazando a todos (admin incluido) por la regla de visibility; el vencimiento es un gate adicional sobre tareas no archivadas.

#### Scenario: Admin agrega item en tarea vencida
- **WHEN** un admin invoca `createChecklistItem` sobre una tarea active vencida
- **THEN** el item se persiste

#### Scenario: Autor member togglea item en su tarea vencida
- **WHEN** un `member` regular que es `authorId` invoca `toggleChecklistItem` sobre un item de su tarea active vencida
- **THEN** el toggle se persiste

#### Scenario: Responsable member no agrega item en tarea vencida
- **WHEN** un `member` regular que es `responsibleId` (no autor, no admin) invoca `createChecklistItem` sobre una tarea active vencida
- **THEN** la operación falla con error de autorización y nada se persiste

#### Scenario: Assignee member no togglea item en tarea vencida
- **WHEN** un `member` regular presente en `task_assignee` (no autor, no admin) invoca `toggleChecklistItem` sobre un item de una tarea active vencida
- **THEN** la operación falla con error de autorización

#### Scenario: Responsable member edita label en tarea no vencida
- **WHEN** un `member` regular que es `responsibleId` invoca `updateChecklistItemLabel` sobre una tarea active no vencida
- **THEN** la edición se persiste (regla previa intacta)

#### Scenario: canManageChecklist refleja gate de vencimiento
- **WHEN** se proyecta `canManageChecklist` para un `member` regular no-autor sobre una tarea active vencida
- **THEN** la capability queda `false`

#### Scenario: Panel renderiza solo-lectura al vencer para member
- **WHEN** un `member` regular no-autor (responsable o assignee) abre el detalle de una tarea active vencida con items en el checklist
- **THEN** el panel renderiza los items en modo solo-lectura sin checkbox interactivo, sin botón de eliminar, sin input "+ agregar item"

#### Scenario: Archived sigue bloqueando a admin
- **WHEN** un admin invoca cualquier acción de mutación de checklist sobre una tarea `archived`
- **THEN** la operación falla por la matriz de visibility existente (no por el gate de vencimiento)
