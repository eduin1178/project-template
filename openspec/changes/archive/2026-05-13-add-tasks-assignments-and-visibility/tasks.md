## 1. Schema y migración

- [x] 1.1 Agregar `responsibleId` a `next-app/lib/db/schema/task.ts` (`text`, nullable, FK `user.id` con `onDelete: "set null"`) + índice `task_responsible_id_idx`.
- [x] 1.2 Crear tabla `taskAssignee` (consolidada en `task.ts` para evitar import circular) con `taskId`, `userId`, PK compuesta, ambas FKs con `onDelete: "cascade"`, índice por `userId`.
- [x] 1.3 Definir `taskAssigneeRelations` y extender `taskRelations` para incluir `responsible` (one-to-one con `user`) y `assignees` (many con `taskAssignee → user`).
- [x] 1.4 Exportar la nueva tabla desde `next-app/lib/db/schema/index.ts` (vía re-export existente de `./task`).
- [x] 1.5 Generar migración Drizzle (`pnpm db:generate`) — produjo `0003_overrated_goblin_queen.sql` con columna, tabla pivot, FKs e índices.

## 2. Guards de autorización

- [x] 2.1 Agregar `requireOrgMember()` a `next-app/lib/auth/guards.ts`: retorna `{ userId, orgId, role }` para cualquier role (`admin`, `owner`, `member`); lanza si falta sesión o `activeOrganizationId`.
- [x] 2.2 Mantener `requireOrgAdmin()` intacto para las acciones que siguen siendo admin-only.
- [x] 2.3 Crear helper `isOrgAdmin(role)` que retorne `role === 'admin' || role === 'owner'` para uso en actions/queries que ramifican por rol.

## 3. Lib de tasks — schemas y dominio

- [x] 3.1 En `next-app/lib/tasks/schemas.ts` agregar Zod schemas para `setResponsibleSchema`, `clearResponsibleSchema`, `addAssigneeSchema`, `removeAssigneeSchema`, `deleteTaskSchema`.
- [x] 3.2 Extender `transitionVisibilitySchema` para aceptar `responsibleId` opcional en el payload (espejando `dueAt`).
- [x] 3.3 `updateTaskContentSchema` permanece igual; el discriminador autor/admin se resuelve en la action.
- [x] 3.4 Agregado helper `requiresResponsibleForActive(to)` en `next-app/lib/tasks/transitions.ts`.

## 4. Lib de tasks — queries

- [x] 4.1 Extender `TaskListItem` en `next-app/lib/tasks/queries.ts` con `responsibleId`, `responsibleName`, `responsibleEmail`, `assignees: { userId, name, email }[]`.
- [x] 4.2 `listTasks` resuelve responsable vía alias join y assignees vía fetch separado con `IN (taskIds)`.
- [x] 4.3 Agregado `listTasksForMember({ orgId, userId })` con filtro de participación y `visibility = 'active'`.
- [x] 4.4 `getTaskWithAuthorById` ahora retorna `TaskListItem` completo (responsable + assignees). `getTaskById` permanece para casos simples.
- [x] 4.5 Agregado `getTaskByIdForViewer({ orgId, taskId, viewerUserId, isAdmin })` que aplica filtro de visibilidad para members.
- [x] 4.6 `getTaskCounts` permanece sin cambios.

## 5. Lib de tasks — actions

- [x] 5.1 Refactor `updateTaskContent` con dos puertas (autor en draft || admin) y `dueAt` restringido a admin no-archived.
- [x] 5.2 Refactor `transitionVisibility` para exigir `responsibleId` al activar.
- [x] 5.3 Implementado `setResponsible` con disyunción (remueve fila en assignees si existía).
- [x] 5.4 Implementado `clearResponsible` con rechazo si visibility = 'active'.
- [x] 5.5 Implementado `addAssignee` con validación de membership + disyunción + onConflictDoNothing.
- [x] 5.6 Implementado `removeAssignee` idempotente.
- [x] 5.7 Implementado `deleteTask` con guard de draft.
- [x] 5.8 `claimAuthorship` permanece admin-only.
- [x] 5.9 `revalidateTaskPaths` invalida `/admin/tasks` y `/tasks` desde todas las acciones.

## 6. Capabilities por tarea

- [x] 6.1 Creado `next-app/lib/tasks/capabilities.ts` con `computeCapabilities` siguiendo la matriz D9.
- [x] 6.2 Exportado `TaskCapabilities`, `computeCapabilities` y helper `readOnlyCapabilities`.
- [~] 6.3 Tests unitarios omitidos: el repo no tiene runner de tests configurado (no hay script `test` en package.json). La función es pura y pequeña; verificable por inspección. Si se agrega vitest/jest en una propuesta futura, agregar coverage entonces.

## 7. UI — componentes compartidos

- [x] 7.1 Creada carpeta `next-app/components/tasks/`.
- [x] 7.2 Componentes `<TaskCard>` y `<TaskReadonlyList>` cubren el listado read-only compartido. El listado admin existente (`tasks-list-panel`) se mantiene; comparte el contrato `TaskListItem`.
- [x] 7.3 Acciones por capability ya implementadas en `TaskRowActions`/`TaskDetailActions` (admin); read-only view en `/tasks` no muestra acciones.
- [x] 7.4 Creado `<TaskAssigneesPanel>` en `_components/task-assignees-panel.tsx`.
- [x] 7.5 `<TaskFilters />` no se generaliza: la vista `/tasks` es solo `active`, no necesita filtros; admin sigue usando su `TasksFiltersPanel` específico.
- [x] 7.6 Copy revisado: usa `tú` ("Selecciona", "Define", "Elige", "Crea", "Edita"). Sin voseo.

## 8. Ruta `/admin/tasks` — integración

- [x] 8.1 `page.tsx` admin actualizada para cargar `listOrgMembers` y pasarlos a `CreateTaskDialog` y `TaskDetailPane`.
- [x] 8.2 `<TaskAssigneesPanel>` integrado en `TaskDetailPane`.
- [x] 8.3 Botón "Eliminar" condicional al draft en `TaskDetailActions` y en `TaskRowActions` (dropdown).
- [x] 8.4 Filtros visibility/status siguen funcionando (no se tocaron).

## 9. Ruta `/tasks` — nueva

- [x] 9.1 Creado `next-app/app/tasks/page.tsx` con `requireOrgMember()`.
- [x] 9.2 Ramificación admin (listTasks visibility=active) vs member (listTasksForMember).
- [x] 9.3 Vista read-only sin controles de escritura (capabilities implícitas en el componente de presentación).
- [x] 9.4 Renderiza `<TaskReadonlyList>` sin filtros.
- [x] 9.5 Creado `next-app/app/tasks/[taskId]/page.tsx` con `getTaskByIdForViewer` y `notFound()` para no participantes.
- [x] 9.6 Copy en español neutral verificado.

## 10. Server queries para members en selectores

- [x] 10.1 `listOrgMembers({ orgId })` agregada en `next-app/lib/tasks/queries.ts`.
- [x] 10.2 Llamada solo desde `app/admin/tasks/page.tsx` (que ya está detrás de `requireOrgAdmin`). La función es pura lectura en server-only; no se expone a clientes.

## 11. Verificación

- [x] 11.1 `npx tsc --noEmit` en `next-app/` → exit 0, sin errores.
- [x] 11.2 `openspec validate add-tasks-assignments-and-visibility --type change --strict` → valid.
- [~] 11.3 Pruebas manuales pendientes para el usuario: este pase de implementación no ejecuta el dev server. Las pruebas listadas deben corroborarse al levantar la app después de aplicar la migración 0003.
- [x] 11.4 Revisado: `/admin/tasks` sigue protegido por `requireOrgAdmin`. `/tasks` y `/tasks/[taskId]` usan `requireOrgMember` y filtran resultados por rol en server-side (admin → listTasks, member → listTasksForMember + getTaskByIdForViewer).
