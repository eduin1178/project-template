## 1. Schema y migración

- [ ] 1.1 Agregar `responsibleId` a `next-app/lib/db/schema/task.ts` (`text`, nullable, FK `user.id` con `onDelete: "set null"`) + índice `task_responsible_id_idx`.
- [ ] 1.2 Crear tabla `taskAssignee` en un archivo nuevo `next-app/lib/db/schema/task-assignee.ts` con `taskId`, `userId`, PK compuesta, ambas FKs con `onDelete: "cascade"`, índice por `userId`.
- [ ] 1.3 Definir `taskAssigneeRelations` y extender `taskRelations` para incluir `responsible` (one-to-one con `user`) y `assignees` (many con `taskAssignee → user`).
- [ ] 1.4 Exportar la nueva tabla desde `next-app/lib/db/schema/index.ts`.
- [ ] 1.5 Generar migración Drizzle (`drizzle-kit generate`) y verificar que el SQL agregue la columna, la tabla pivot y los índices.

## 2. Guards de autorización

- [ ] 2.1 Agregar `requireOrgMember()` a `next-app/lib/auth/guards.ts`: retorna `{ userId, orgId, role }` para cualquier role (`admin`, `owner`, `member`); lanza si falta sesión o `activeOrganizationId`.
- [ ] 2.2 Mantener `requireOrgAdmin()` intacto para las acciones que siguen siendo admin-only.
- [ ] 2.3 Crear helper `isOrgAdmin(role)` que retorne `role === 'admin' || role === 'owner'` para uso en actions/queries que ramifican por rol.

## 3. Lib de tasks — schemas y dominio

- [ ] 3.1 En `next-app/lib/tasks/schemas.ts` agregar Zod schemas para `setResponsibleSchema`, `clearResponsibleSchema`, `addAssigneeSchema`, `removeAssigneeSchema`, `deleteTaskSchema`.
- [ ] 3.2 Extender `transitionVisibilitySchema` para aceptar `responsibleId` opcional en el payload (espejando `dueAt`).
- [ ] 3.3 Extender `updateTaskContentSchema` para reflejar las nuevas reglas (el discriminador de "soy autor en draft" vs "soy admin" se resuelve en la action, no en el schema).
- [ ] 3.4 En `next-app/lib/tasks/transitions.ts` no cambia la matriz de transiciones; agregar (si no existe) helper `requiresResponsibleForActive(to)` retornando `to === 'active'`.

## 4. Lib de tasks — queries

- [ ] 4.1 Extender `TaskListItem` en `next-app/lib/tasks/queries.ts` con `responsibleId`, `responsibleName`, `responsibleEmail`, `assignees: { userId, name, email }[]`.
- [ ] 4.2 Renombrar mentalmente `listTasks` → mantener la firma pero ahora resuelve responsable (LEFT JOIN user por `responsibleId`) y assignees (fetch separado por `IN (taskIds)` + agrupación en TS).
- [ ] 4.3 Agregar `listTasksForMember({ orgId, userId })`: retorna solo tareas con `visibility = 'active'` donde `authorId = userId` OR `responsibleId = userId` OR existe fila en `task_assignee` con ese userId. Mismo shape de retorno que `listTasks`. Orden default `createdAt DESC`.
- [ ] 4.4 Extender `getTaskById` y `getTaskWithAuthorById` para resolver responsable y assignees.
- [ ] 4.5 Agregar `getTaskByIdForViewer({ orgId, taskId, viewerUserId, isAdmin })`: si es admin retorna la tarea; si es member retorna la tarea SOLO si está active y participa; null en otro caso. Usar este path para el detalle de `/tasks`.
- [ ] 4.6 Verificar que `getTaskCounts` (admin) sigue funcionando sin cambios (filtra solo por org).

## 5. Lib de tasks — actions

- [ ] 5.1 Refactor `updateTaskContent` para implementar las dos puertas (autor en draft || admin): consultar tarea, derivar rol vía `requireOrgMember`, decidir qué campos (`title`, `description`, `dueAt`) puede tocar según las reglas del spec `tasks-core`.
- [ ] 5.2 Refactor `transitionVisibility` para validar `responsibleId` además de `dueAt` cuando `to === 'active'` (acepta `responsibleId` en payload, idéntico patrón al `dueAt`).
- [ ] 5.3 Implementar `setResponsible(input)`: valida invocador (autor o admin), valida `userId` ∈ members(org); si el `userId` está en `task_assignee`, eliminarlo en la misma transacción antes de set; persistir.
- [ ] 5.4 Implementar `clearResponsible(input)`: valida invocador; rechaza si visibility = 'active'; setea `responsibleId = NULL`.
- [ ] 5.5 Implementar `addAssignee(input)`: valida invocador; valida `userId` ∈ members(org); rechaza si `userId === responsibleId`; insertar con `ON CONFLICT DO NOTHING` para idempotencia.
- [ ] 5.6 Implementar `removeAssignee(input)`: valida invocador; delete idempotente (no error si no existía).
- [ ] 5.7 Implementar `deleteTask(input)`: valida que sea autor o admin; rechaza si `visibility != 'draft'`; delete físico (cascada limpia assignees).
- [ ] 5.8 Asegurar que `claimAuthorship` sigue solo admin (sin cambio funcional, posible refresh de mensajes de error).
- [ ] 5.9 `revalidatePath` también para `/tasks` desde todas las acciones que afectan visibilidad o contenido visible para members.

## 6. Capabilities por tarea

- [ ] 6.1 Crear `next-app/lib/tasks/capabilities.ts` con función `computeCapabilities({ task, viewerUserId, viewerRole })` que retorna `TaskCapabilities` (canEditContent, canEditDueAt, canDelete, canClaim, canTransitionVisibility, canTransitionStatus, canManageTeam, canViewDetail) según la matriz definida en design.md (D9).
- [ ] 6.2 Exportar tipo `TaskCapabilities` y la función.
- [ ] 6.3 Agregar tests unitarios de la función (input puro, sin DB) cubriendo: admin en todas las visibilities; member-autor en draft/active; member-responsable; member-assignee; member-no-relacionado.

## 7. UI — componentes compartidos

- [ ] 7.1 Crear carpeta `next-app/components/tasks/` (si no existe la organización de componentes para esta feature).
- [ ] 7.2 Componente `<TaskList items capabilitiesByTask />` que reemplaza el listado actual de `/admin/tasks` y consume capabilities por fila.
- [ ] 7.3 Componente `<TaskRow task capabilities />` con acciones condicionales: muestra "Editar" si `canEditContent`, "Eliminar" si `canDelete`, etc.
- [ ] 7.4 Componente `<TaskAssigneesPanel task capabilities membersOptions />` para gestión de responsable y assignees (selectores que listan members de la org; reglas de exclusión de UI según disyunción).
- [ ] 7.5 Componente `<TaskFilters />` parametrizado por `enabled` (false en `/tasks`).
- [ ] 7.6 Verificar que todo el copy está en español neutral en `tú` (revisar Ingresa/Selecciona/Elige; sin voseo).

## 8. Ruta `/admin/tasks` — integración

- [ ] 8.1 Actualizar `next-app/app/admin/tasks/page.tsx` (y archivos asociados) para consumir el `<TaskList>` compartido + calcular `capabilities` por tarea (admin siempre tiene la mayoría en true).
- [ ] 8.2 Integrar `<TaskAssigneesPanel>` en el detalle/edición de cada tarea con acceso a la lista de members de la org activa.
- [ ] 8.3 Mostrar botón "Eliminar" solo cuando `canDelete` es true (draft only).
- [ ] 8.4 Verificar que el listado sigue funcionando para admin con filtros visibility/status.

## 9. Ruta `/tasks` — nueva

- [ ] 9.1 Crear `next-app/app/tasks/page.tsx` protegido por `requireOrgMember()`.
- [ ] 9.2 Server-side: si role es admin/owner usar `listTasks` filtrando visibility = ['active']; si es member usar `listTasksForMember`.
- [ ] 9.3 Calcular capabilities por tarea con `canViewDetail = true` y el resto en `false` (vista read-only).
- [ ] 9.4 Renderizar `<TaskList>` con filtros desactivados y sin controles de escritura.
- [ ] 9.5 Crear `next-app/app/tasks/[taskId]/page.tsx` (detalle read-only) protegido por `requireOrgMember()` + `getTaskByIdForViewer` (404 si no aplica).
- [ ] 9.6 Verificar copy en español neutral.

## 10. Server queries para members en selectores

- [ ] 10.1 En `next-app/lib/auth/...` o `next-app/lib/tasks/queries.ts` agregar `listOrgMembers(orgId)` que retorna `{ userId, name, email, role }[]` para alimentar selectores.
- [ ] 10.2 Asegurar que solo admins pueden invocar esta query (vía `requireOrgAdmin` en la action o page server).

## 11. Verificación

- [ ] 11.1 Validar tipos: `pnpm tsc --noEmit` (o el comando equivalente del repo) en `next-app/`.
- [ ] 11.2 Validar el change con `openspec validate add-tasks-assignments-and-visibility --strict`.
- [ ] 11.3 Probar manualmente:
    - Admin crea tarea en draft, agrega responsable y assignees, activa (con dueAt + responsibleId), archiva.
    - Member ve solo las tareas active donde participa en `/tasks`.
    - Admin intenta editar `dueAt` de una archived → falla.
    - Admin elimina draft → ok; intenta eliminar active → falla.
    - Activar sin responsable → error claro de validación.
    - `clearResponsible` sobre active → error.
    - `setResponsible` con un usuario que ya es assignee → assignee removido + responsable seteado en una sola operación.
- [ ] 11.4 Revisar que ninguna ruta admin-only quedó accidentalmente abierta a members y viceversa.
