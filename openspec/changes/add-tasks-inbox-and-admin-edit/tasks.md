## 1. Shell compartido bajo `components/tasks/`

- [ ] 1.1 Mover `next-app/app/admin/tasks/_components/create-task-dialog.tsx` a `next-app/components/tasks/create-task-dialog.tsx`.
- [ ] 1.2 Mover `next-app/app/admin/tasks/_components/tasks-filters-panel.tsx` a `next-app/components/tasks/tasks-filters-panel.tsx`.
- [ ] 1.3 Mover `next-app/app/admin/tasks/_components/tasks-list-panel.tsx` a `next-app/components/tasks/tasks-list-panel.tsx`.
- [ ] 1.4 Mover `next-app/app/admin/tasks/_components/task-detail-pane.tsx` a `next-app/components/tasks/task-detail-pane.tsx`.
- [ ] 1.5 Mover `next-app/app/admin/tasks/_components/task-detail-actions.tsx` a `next-app/components/tasks/task-detail-actions.tsx`.
- [ ] 1.6 Mover `next-app/app/admin/tasks/_components/task-row-actions.tsx` a `next-app/components/tasks/task-row-actions.tsx`.
- [ ] 1.7 Mover `next-app/app/admin/tasks/_components/task-team-summary.tsx` a `next-app/components/tasks/task-team-summary.tsx`.
- [ ] 1.8 Mover `next-app/app/admin/tasks/_components/task-assignees-panel.tsx` a `next-app/components/tasks/task-assignees-panel.tsx`.
- [ ] 1.9 Mover `next-app/app/admin/tasks/_components/task-comments-placeholder.tsx` a `next-app/components/tasks/task-comments-placeholder.tsx`.
- [ ] 1.10 Eliminar el directorio `next-app/app/admin/tasks/_components/` una vez vacío.
- [ ] 1.11 Eliminar `next-app/components/tasks/task-readonly-list.tsx` (obsoleto tras la unificación).
- [ ] 1.12 Actualizar todos los imports en `next-app/app/admin/tasks/page.tsx` para apuntar a las nuevas rutas en `@/components/tasks/*`.
- [ ] 1.13 Buscar referencias residuales a `app/admin/tasks/_components` en el repo (`grep`) y migrarlas.
- [ ] 1.14 Verificar que `/admin/tasks` sigue funcionando sin cambios funcionales tras el move.

## 2. Contrato `TaskCapabilities`

- [ ] 2.1 Crear `next-app/components/tasks/capabilities.ts` con el tipo `TaskCapabilities` (campos: `canEditContent`, `canEditDueAt`, `canManageTeam`, `canTransitionVisibility`, `canTransitionStatus`, `canDelete`, `canClaim`).
- [ ] 2.2 Implementar en el mismo módulo el helper `computeTaskCapabilities({ task, viewer })` siguiendo la matriz documentada en `design.md` (D2).
- [ ] 2.3 Cubrir el helper con tests unitarios que ejerciten los casos admin, autor-no-admin en draft/active/archived, responsable, assignee y member sin relación. (Si no hay infra de tests unitarios en `next-app/`, dejar este paso como TODO documentado y validar manualmente.)

## 3. Cableado de `capabilities` en los componentes de detalle

- [ ] 3.1 Añadir prop `capabilities: TaskCapabilities` a `TaskDetailPane` y propagarla a sus hijos.
- [ ] 3.2 Refactor de `TaskDetailActions` para leer `capabilities.canTransitionVisibility`, `canTransitionStatus`, `canDelete`, `canClaim` y eliminar el chequeo ad hoc `task.authorId !== currentUserId`.
- [ ] 3.3 Refactor de `TaskRowActions` análogo, leyendo capabilities en lugar de derivar permisos por su cuenta.
- [ ] 3.4 Refactor de `TaskAssigneesPanel` y `TaskTeamSummary` para condicionar controles a `capabilities.canManageTeam`.
- [ ] 3.5 Asegurar que `TaskDetailPane` ya no recibe `currentUserId` como prop si todo el control pasa por `capabilities` (o conservarlo solo si sigue siendo necesario para mostrar avatares "soy yo").

## 4. Reescribir `/tasks` con el shell compartido

- [ ] 4.1 Reescribir `next-app/app/tasks/page.tsx` para construir el shell de tres paneles igual que `/admin/tasks` (filtros | lista | detalle).
- [ ] 4.2 Calcular server-side el listado: admin → `listTasks({ filters: { visibility: ["active"], status } })`; member → `listTasksForMember({ orgId, userId, filters: { status } })`. (Si `listTasksForMember` no acepta filtros de `status`, ajustar su firma; sin cambios al schema.)
- [ ] 4.3 Resolver la tarea seleccionada server-side leyendo `searchParams.taskId` con `getTaskByIdForViewer({ ..., isAdmin })`; fallback a la primera de la lista.
- [ ] 4.4 Calcular `capabilities` server-side para la tarea seleccionada y pasarlas a `TaskDetailPane`.
- [ ] 4.5 Renderizar `TasksFiltersPanel` con la nueva prop `showVisibility={false}` (ver 5).
- [ ] 4.6 NO renderizar `CreateTaskDialog` en esta ruta.
- [ ] 4.7 Validar que el shell respeta la altura del viewport igual que en admin (`h-[calc(100vh-4rem)]`, etc.).

## 5. `TasksFiltersPanel` parametrizable

- [ ] 5.1 Añadir prop `showVisibility?: boolean` (default `true`) a `TasksFiltersPanel`.
- [ ] 5.2 Si `showVisibility === false`, omitir el grupo de filtros por `visibility` en el render; mantener intacto el grupo `status`.
- [ ] 5.3 Verificar que `/admin/tasks` (que pasará `showVisibility={true}` o lo dejará por default) sigue mostrando ambos filtros sin regresión.

## 6. Redirect de `/tasks/[taskId]` a `/tasks?taskId=`

- [ ] 6.1 Reemplazar el contenido de `next-app/app/tasks/[taskId]/page.tsx` por un redirect 308 a `/tasks?taskId=<id>` usando `redirect` de `next/navigation` con `permanent: true` (o equivalente vía `proxy.ts` si el helper de Next 16 lo requiere — verificar en `node_modules/next/dist/docs/`).
- [ ] 6.2 Confirmar manualmente que `/tasks/<id>` produce 308 y resuelve en `/tasks?taskId=<id>`.

## 7. Sidebar `/app` con item Tareas

- [ ] 7.1 En `next-app/components/layout/contexts/app.ts`, agregar al array `items` un nuevo objeto `{ label: "Tareas", href: "/tasks", icon: createElement(ListChecksIcon) }`.
- [ ] 7.2 Importar `ListChecksIcon` desde `@phosphor-icons/react/dist/ssr` siguiendo el patrón del `HouseIcon` existente.
- [ ] 7.3 Verificar manualmente que el ítem aparece en `/app` para un usuario member y resalta como activo cuando se navega a `/tasks`.

## 8. `EditTaskDialog`

- [ ] 8.1 Crear `next-app/components/tasks/edit-task-dialog.tsx` como componente client.
- [ ] 8.2 Props: `task: { id, title, description, dueAt, visibility }`, `capabilities: Pick<TaskCapabilities, "canEditContent" | "canEditDueAt">`, `open`, `onOpenChange`.
- [ ] 8.3 Form con `react-hook-form` + `zodResolver`, schema basado en `updateTaskContentSchema` (`title` ≤ 200, `description` ≤ 5000, `dueAt` opcional).
- [ ] 8.4 Campos: `title` (Input), `description` (Textarea con `rows={8}`, `className="min-h-[200px] max-h-[400px] resize-y"`), `dueAt` (Input `type="datetime-local"`).
- [ ] 8.5 `title` y `description` `disabled={!capabilities.canEditContent}`; campo `dueAt` se omite del render si `!capabilities.canEditDueAt`.
- [ ] 8.6 `onSubmit`: invocar `updateTaskContent` con solo los campos modificados; toast de éxito/error; `router.refresh()` en éxito; cerrar diálogo.
- [ ] 8.7 Copy en español neutral (`"Edita la tarea"`, `"Guardar cambios"`, `"Cierra"`); revisar mensajes de error del schema para que no usen voseo.

## 9. Botón "Editar" en `TaskDetailPane`

- [ ] 9.1 Añadir en el header del `TaskDetailPane` (al lado de `TaskTeamSummary` o cerca del `Separator` vertical) un `<Button size="sm" variant="outline">` con icono `PencilSimpleIcon` y label "Editar".
- [ ] 9.2 Renderizar el botón solo si `capabilities.canEditContent || capabilities.canEditDueAt`.
- [ ] 9.3 Manejar `open`/`onOpenChange` para el `EditTaskDialog` en estado local del pane (o composición vía `Dialog` controlado).
- [ ] 9.4 Pasar `task` y la sub-vista de `capabilities` correspondiente al diálogo.

## 10. Textarea agrandado en `CreateTaskDialog`

- [ ] 10.1 En `next-app/components/tasks/create-task-dialog.tsx`, subir `rows` del `<Textarea>` de descripción a `8` y añadir `className="min-h-[200px] max-h-[400px] resize-y"`.
- [ ] 10.2 Mantener el resto del comportamiento del dialog intacto.

## 11. Scroll de descripción en `TaskDetailPane`

- [ ] 11.1 En `task-detail-pane.tsx`, quitar `overflow-y-auto` del contenedor raíz (línea de la división `flex h-full flex-col`).
- [ ] 11.2 Cambiar el wrapper del bloque de descripción a `className="flex-1 overflow-y-auto px-5 py-6"` para que solo ese bloque scrollee.
- [ ] 11.3 Verificar visualmente que con una descripción larga el header (avatar, título, badges) y la barra de acciones permanecen visibles mientras se scrollea la descripción.
- [ ] 11.4 Verificar que con descripción corta no aparece scrollbar.

## 12. Paridad de queries para member

- [ ] 12.1 Inspeccionar `listTasksForMember` y `getTaskByIdForViewer` en `next-app/lib/tasks/queries.ts`; confirmar que devuelven el shape completo de `TaskListItem` (autor, responsable, assignees, dueAt, etc.) que requiere `TaskDetailPane`.
- [ ] 12.2 Si falta algún campo, ajustar las queries (sin tocar schema) para igualar la forma con `listTasks` / `getTaskWithAuthorById`.
- [ ] 12.3 Si `listTasksForMember` no acepta filtros por `status`, extender su firma con el mismo contrato que `listTasks.filters.status` (mantener compatibilidad: sin filtro = todos los `active` donde participa).

## 13. Limpieza y verificación

- [ ] 13.1 Ejecutar `tsc --noEmit` en `next-app/` y resolver errores de tipos derivados del move y de las nuevas props.
- [ ] 13.2 Ejecutar el linter del repo y arreglar warnings introducidos.
- [ ] 13.3 Auditoría manual: navegar `/admin/tasks` como admin y `/tasks` como member en una sesión de prueba; verificar que ambos shells funcionan, que las capabilities filtran botones correctamente, y que la edición de admin persiste.
- [ ] 13.4 Auditoría manual de copy: revisar diálogos, toasts, labels y errores nuevos para confirmar que no hay voseo y que el español es neutral con `tú`.
- [ ] 13.5 Confirmar que `/tasks/<id>` produce redirect 308 a `/tasks?taskId=<id>`.
- [ ] 13.6 Confirmar que el ítem "Tareas" en el sidebar de `/app` navega correctamente y se marca activo en `/tasks`.

## 14. PR

- [ ] 14.1 Documentar en la descripción del PR que requiere `size:exception` (500–700 líneas estimadas, decisión tomada en exploración).
- [ ] 14.2 Agrupar los commits por tema (move shell, capabilities, /tasks shell, redirect, sidebar, edit dialog, UX polish) para facilitar la revisión.
- [ ] 14.3 Enlazar el cambio archivado `add-tasks-assignments-and-visibility` y este change `add-tasks-inbox-and-admin-edit` en la descripción.
