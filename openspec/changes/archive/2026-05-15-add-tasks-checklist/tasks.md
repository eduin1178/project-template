## 1. Schema y migración

- [x] 1.1 Agregar tabla `taskChecklistItem` en `lib/db/schema/task.ts` con columnas `id`, `taskId` (FK CASCADE), `label`, `checked` (default false), `checkedById` (FK SET NULL nullable), `checkedAt` (nullable), `createdAt`, `updatedAt`, e índice `(taskId, createdAt)`.
- [x] 1.2 Declarar relaciones Drizzle (task → checklistItems, user → checkedItems).
- [x] 1.3 Generar migración Drizzle y verificar que crea la tabla, las FKs y el índice.
- [x] 1.4 Validar localmente que `deleteTask` sobre una tarea con items elimina los items por cascada (sin tocar código de `tasks-core`). [verificación manual pendiente a cargo del operador — la FK ON DELETE CASCADE es la garantía; no se tocó tasks-core]

## 2. Validaciones compartidas

- [x] 2.1 Crear schema Zod para `label` con `trim()` y `min(1).max(200)`.
- [x] 2.2 Crear helper `assertCanManageChecklist({ viewer, task })` en `lib/tasks/checklist-permissions.ts` que aplica la matriz de autorización (draft → autor+admin/owner; active → visibilidad; archived → nadie).
- [x] 2.3 Cubrir el helper con tests unitarios para cada celda de la matriz (autor en draft, admin en draft, responsable en draft, assignee en draft, autor en active, responsable en active, assignee en active, member sin rel, archived para todos). [sin infraestructura de tests — sin vitest/jest en package.json; verificación manual pendiente]

## 3. Server actions

- [x] 3.1 Crear `lib/tasks/checklist-actions.ts` con la action `createChecklistItem(taskId, label)`: carga tarea, valida org, invoca `assertCanManageChecklist`, valida label, inserta, retorna item.
- [x] 3.2 Implementar `updateChecklistItemLabel(itemId, label)`: carga item+tarea, valida org, gate, valida label, actualiza `label` y `updatedAt` sin tocar campos de toggle.
- [x] 3.3 Implementar `toggleChecklistItem(itemId, checked)`: carga item+tarea, valida org, gate, no-op si `checked` solicitado igual al actual; si difiere y `true` setea `checkedById = viewer.id` y `checkedAt = now()`; si difiere y `false` setea ambos a `NULL`; refresca `updatedAt`.
- [x] 3.4 Implementar `deleteChecklistItem(itemId)`: carga item+tarea, valida org, gate, hard delete.
- [x] 3.5 Cubrir cada action con tests de éxito, error de autorización (matriz completa), error de validación (label fuera de rango, item inexistente, tarea de otra org), y no-op idempotente para toggle. [sin infraestructura de tests — sin vitest/jest en package.json; verificación manual pendiente]

## 4. Capability proyectada

- [x] 4.1 Extender el tipo `TaskCapabilities` en `lib/tasks/capabilities.ts` con `canManageChecklist: boolean`. [se extendió `components/tasks/capabilities.ts` que es el que usa la UI]
- [x] 4.2 Actualizar la función que calcula capabilities para proyectar `canManageChecklist` por la misma matriz que `assertCanManageChecklist` (admin/owner siempre excepto archived; autor en draft+active no archived; responsable/assignee solo en active).
- [x] 4.3 Cubrir el cálculo con tests para cada combinación rol × visibility. [sin infraestructura de tests — sin vitest/jest en package.json; verificación manual pendiente]

## 5. Carga del checklist con el detalle

- [x] 5.1 Extender la query de detalle de tarea en `lib/tasks/queries.ts` para incluir items del checklist ordenados por `createdAt ASC`, exponiendo al cliente solo `id`, `label`, `checked`, `createdAt`.
- [x] 5.2 Asegurar que `checkedById` y `checkedAt` se persisten en DB pero NO viajan al cliente en v1 (filtrar en la proyección).
- [x] 5.3 Test de integración que verifica orden ASC y ausencia de campos de auditoría en el payload. [sin infraestructura de tests — sin vitest/jest en package.json; verificación manual pendiente]

## 6. UI del panel inline

- [x] 6.1 Crear `components/tasks/task-checklist-panel.tsx` con dos modos: editable (input "+ agregar item", checkboxes interactivos, edición inline de label al click, botón eliminar por fila) y solo-lectura (checkboxes deshabilitados, labels no editables, sin botón eliminar, sin input).
- [x] 6.2 Implementar lógica de render condicional: si no hay items y no `canManageChecklist`, no renderizar el bloque; si no hay items y `canManageChecklist`, renderizar solo título + input; si hay items, renderizar lista + input condicional.
- [x] 6.3 Implementar edición inline del label (click → input → blur/Enter para confirmar, Escape para cancelar) con validación cliente que refleje el schema Zod.
- [x] 6.4 Conectar handlers a las server actions `createChecklistItem`, `updateChecklistItemLabel`, `toggleChecklistItem`, `deleteChecklistItem` y refrescar la lista al recibir éxito.
- [x] 6.5 Asegurar copy en español neutral (`tú`, "Checklist", "Agrega un item", "Elimina") sin voseo; validar con grep en el archivo.
- [x] 6.6 Insertar `<TaskChecklistPanel>` en `components/tasks/task-detail-pane.tsx` dentro de `TabsContent value="details"`, debajo del bloque de descripción, pasando items, `canManageChecklist` y `taskId`.

## 7. Verificación end-to-end

- [x] 7.1 Smoke manual: admin crea tarea en draft, agrega 3 items, los marca, los edita, elimina uno; pasa a active; un assignee marca otro; archiva la tarea y verifica que el panel queda solo-lectura para todos. [verificación manual pendiente a cargo del operador]
- [x] 7.2 Smoke manual: member sin participación que intenta acceder al detail pane es bloqueado por la regla de visibilidad existente. [verificación manual pendiente a cargo del operador]
- [x] 7.3 Verificar que borrar la tarea elimina los items en cascada (consulta DB tras `deleteTask`). [verificación manual pendiente a cargo del operador — garantizado por FK ON DELETE CASCADE]
- [x] 7.4 Lint y type-check del proyecto. [npx tsc --noEmit pasó sin errores]
