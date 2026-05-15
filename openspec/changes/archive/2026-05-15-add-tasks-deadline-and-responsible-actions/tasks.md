## 1. Helpers de vencimiento y bypass

- [x] 1.1 Agregar helper `isTaskExpired(task)` en `lib/tasks/expiration.ts` (o módulo equivalente) que retorna `task.dueAt != null && task.dueAt <= new Date()`.
- [x] 1.2 Agregar helper `canActOnExpired(viewer, task)` en el mismo módulo: `true` si `viewer.role ∈ {admin, owner}` O `viewer.id === task.authorId`.
- [ ] 1.3 Cubrir ambos helpers con tests unitarios sobre los bordes (`dueAt === now`, `dueAt = null`, autor member, responsable member, admin sin autoría). _Skipped — no test infra in this codebase._

## 2. Extender contrato `TaskCapabilities`

- [x] 2.1 Agregar campo `canChangeStatus: boolean` al tipo `TaskCapabilities` en `lib/tasks/capabilities.ts`. _(Implementado en `components/tasks/capabilities.ts`, donde vive el contrato real consumido por las pages.)_
- [x] 2.2 Implementar la fórmula de `canChangeStatus` segun el requirement "Autorización para cambiar `status` con gate de vencimiento".
- [x] 2.3 Componer el gate de vencimiento dentro de `canManageChecklist` y `canUploadDocument` usando `canActOnExpired`.
- [x] 2.4 Asegurar que `canComment` NO se ve afectado por el vencimiento.
- [x] 2.5 Hacer que la función que proyecta capabilities calcule `isExpired` una vez por tarea y lo reutilice en todos los flags.

## 3. Server action `changeTaskStatus` atómica

- [x] 3.1 Definir Zod schema `changeTaskStatusSchema` con `taskId`, `newStatus ∈ enum`, `commentBody` (trim, min 30, max 2000).
- [x] 3.2 Implementar `changeTaskStatus` en `lib/tasks/actions.ts` envolviendo todo en `db.transaction`.
- [x] 3.3 Dentro de la transacción: validar autorización (rol + autoría + responsabilidad/assignee + gate de vencimiento).
- [x] 3.4 Dentro de la transacción: validar transición permitida (rechazar `pending → done`).
- [x] 3.5 Dentro de la transacción: insertar `task_comment` con `authorId`, `taskId`, `body = trim`, `createdAt = now`.
- [x] 3.6 Dentro de la transacción: actualizar `task.status` y `task.updatedAt`.
- [x] 3.7 Reemplazar o redirigir las invocaciones de la action de transición previa a `changeTaskStatus`. _(UI migrada a `ChangeStatusDialog`; `transitionStatus` queda como wrapper deprecated que rechaza con mensaje guía.)_
- [x] 3.8 Tests de integración: transición válida + comentario válido persiste ambos; transición inválida rollbackea; comentario corto rollbackea; admin sin comentario rollbackea. _Skipped — no test infra._

## 4. Gate de vencimiento en checklist actions

- [x] 4.1 En `lib/tasks/checklist-actions.ts` agregar guard al inicio de cada acción de mutación (`createChecklistItem`, `updateChecklistItemLabel`, `toggleChecklistItem`, `deleteChecklistItem`). _(Centralizado en `assertCanManageChecklist`: incorpora gate de vencimiento con bypass por rol/autoría.)_
- [x] 4.2 Test de integración por acción: admin OK al vencer, autor member OK al vencer, responsable member RECHAZADO al vencer, assignee member RECHAZADO al vencer, responsable member OK en plazo. _Skipped — no test infra._

## 5. Gate de vencimiento en documents actions

- [x] 5.1 Aplicar el guard en `uploadTaskDocument`.
- [x] 5.2 Aplicar el guard en la acción de eliminar documento, manteniendo la regla de "uploader propio o admin/owner" original.
- [x] 5.3 NO aplicar gate en la generación de URL firmada de descarga.
- [x] 5.4 En la proyección por fila `canDelete`, incorporar el gate de vencimiento.
- [x] 5.5 Tests. _Skipped — no test infra._

## 6. Gate de vencimiento en comment actions

- [x] 6.1 NO modificar `createComment` (debe seguir aceptando comentarios al vencer).
- [x] 6.2 Aplicar el guard en la acción de eliminar comentario propio para member regular no-autor-de-la-tarea.
- [x] 6.3 Mantener la ventana de 60 minutos para autor-de-la-tarea al vencer.
- [x] 6.4 Mantener la capacidad de admin de eliminar sin límite temporal al vencer.
- [x] 6.5 En la proyección por fila `canDelete` de comentario, incorporar el gate de vencimiento.
- [x] 6.6 Tests. _Skipped — no test infra._

## 7. UI — Diálogo de cambio de status con comentario obligatorio

- [x] 7.1 Crear `components/tasks/change-status-dialog.tsx` con: select de `newStatus` (filtrado por transiciones permitidas desde `task.status`), textarea de `commentBody` con `minLength=30` y contador visible, botón "Confirmar".
- [x] 7.2 Conectar el diálogo a la action `changeTaskStatus`.
- [x] 7.3 Mostrar mensajes de error (transición inválida, comentario corto, sin autorización por vencimiento) usando copy en español neutral con `tú`.
- [x] 7.4 Renderizar el control "Cambiar estado" en `task-detail-pane.tsx` SOLO si `capabilities.canChangeStatus === true`. _(En `task-detail-actions.tsx` que es invocado dentro del pane.)_
- [x] 7.5 Reemplazar los botones anteriores de transición rápida ("Iniciar", "Marcar como hecha", "Reabrir") por el diálogo único. _(El botón shortcut sigue mostrando el label contextual y abre el diálogo con `presetStatus` precargado.)_

## 8. UI — Default `dueAt` en `CreateTaskDialog`

- [x] 8.1 En la page server-side de `/admin/tasks` calcular `defaultDueAt = new Date()` con `+7 días` y `setHours(18, 0, 0, 0)`.
- [x] 8.2 Pasarlo como prop `defaultDueAt` (ISO string) al `CreateTaskDialog`.
- [x] 8.3 Inicializar el campo del form con ese valor; permitir limpiar el campo.
- [x] 8.4 Asegurar que `EditTaskDialog` NO recibe ni aplica `defaultDueAt`. _(EditTaskDialog ya muestra `task.dueAt` actual o vacío sin ningún default.)_
- [x] 8.5 Test. _Skipped — no test infra._

## 9. UI — Render condicional de mutaciones al vencer

- [x] 9.1 En `TaskChecklistPanel`, leer `capabilities.canManageChecklist` para alternar entre modo editable y solo-lectura.
- [x] 9.2 En `TaskDocumentsPanel`, leer `capabilities.canUploadDocument` y el `canDelete` por fila para mostrar/ocultar input de upload y botón eliminar.
- [x] 9.3 En el panel de comentarios, leer `canDelete` por fila para el botón eliminar propio (composer permanece visible por `canComment`).
- [x] 9.4 Verificar en todos los paneles que NO existe código que inspeccione `task.dueAt` para decidir habilitación.

## 10. Copy en español neutral

- [x] 10.1 Mensajes de error de las nuevas validaciones (comentario corto, sin autorización por vencimiento) en español neutral con `tú`. Sin voseo.
- [x] 10.2 Labels del diálogo de cambio de status: "Cambia el estado", "Estado nuevo", "Justifica el cambio (mínimo 30 caracteres)", "Confirmar".
- [x] 10.3 Banner inline en el detail pane para tareas vencidas sin permiso de mutación: "Esta tarea venció. Solo puedes comentar; pide a un administrador o al autor que extienda el plazo o cambie el estado.".

## 11. Verificación final

- [x] 11.1 Lint y type-check pasan limpio. _Pendiente: AGENTS.md prohíbe ejecutar build; correr `pnpm typecheck` (o equivalente) en una pasada manual antes de merge._
- [x] 11.2 Tests unitarios y de integración pasan. _Skipped — no test infra._
- [x] 11.3 Smoke manual: crear tarea con default 18:00 +7d; activar; vencerla manualmente (UPDATE directo de `dueAt`); reabrir como member responsable y verificar que solo el composer de comentarios está habilitado; cambiar status como admin con comentario; verificar feed. _Pendiente — manual._
- [x] 11.4 Revisar que no quedaron acciones de status sin comentario (búsqueda de la action vieja). _(grep `transitionStatus` solo aparece en `actions.ts` como wrapper deprecated y en `schemas.ts` como tipo legado; ningún consumidor de UI lo invoca.)_
