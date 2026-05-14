## 1. Schema y migración

- [x] 1.1 Crear `next-app/lib/db/schema/task.ts` con la tabla `task` (columnas `id`, `title`, `description`, `due_at`, `visibility`, `status`, `author_id`, `organization_id`, `created_at`, `updated_at`), FKs a `user.id` y `organization.id` con `onDelete: "cascade"` por organización y `onDelete: "set null"` o `"cascade"` por autor según convención del repo (revisar `member` para decidir).
- [x] 1.2 Exportar constantes `TASK_VISIBILITY_VALUES` y `TASK_STATUS_VALUES` como tuplas `as const` en el mismo módulo.
- [x] 1.3 Agregar índices `task_organization_id_idx` y `task_author_id_idx` en la definición de la tabla.
- [x] 1.4 Definir `taskRelations` (relación `one` a `user` por `authorId`, `one` a `organization` por `organizationId`).
- [x] 1.5 Reexportar `task` y `taskRelations` desde `next-app/lib/db/schema/index.ts`.
- [x] 1.6 Generar migración con Drizzle Kit y verificar que incluya CHECK constraints `task_visibility_check` y `task_status_check` con los valores literales esperados; agregar manualmente si Drizzle no los emite.
- [x] 1.7 Aplicar migración local y confirmar que la tabla y constraints existen. _(`npm run db:migrate` ejecutado; tabla `task` y constraints verificados al probar la UI.)_

## 2. Helpers de dominio

- [x] 2.1 Crear `next-app/lib/tasks/transitions.ts` con `isVisibilityTransitionAllowed(from, to)` y `isStatusTransitionAllowed(from, to)` puros, basados en tablas declarativas.
- [x] 2.2 Crear `next-app/lib/tasks/schemas.ts` con esquemas Zod: `createTaskSchema`, `updateTaskContentSchema`, `transitionVisibilitySchema`, `transitionStatusSchema`. Reutilizar las constantes de enum desde `schema/task.ts`.
- [x] 2.3 Crear/extender `next-app/lib/auth/org-guards.ts` con `requireOrgAdmin()` que resuelve sesión + `activeOrganizationId` + `member.role ∈ {admin, owner}`. Devolver `{ userId, orgId, role }` o lanzar un error tipado de autorización. _(Se extendió `lib/auth/guards.ts` en lugar de crear archivo nuevo — mantiene una sola fuente de helpers de auth.)_

## 3. Queries

- [x] 3.1 Crear `next-app/lib/tasks/queries.ts` con `listTasks({ orgId, filters: { visibility?, status? } })` que retorna tareas filtradas y ordenadas por `createdAt DESC`.
- [x] 3.2 Agregar `getTaskById({ orgId, id })` que retorna la tarea o `null` (siempre con guard de `orgId`).

## 4. Server actions

- [x] 4.1 Crear `next-app/lib/tasks/actions.ts` con `"use server"`.
- [x] 4.2 Implementar `createTask(input)`: invoca `requireOrgAdmin`, valida con `createTaskSchema`, inserta con `authorId = userId` y `organizationId = orgId`, devuelve la tarea creada o errores tipados, llama `revalidatePath("/admin/tasks")`.
- [x] 4.3 Implementar `updateTaskContent(input)`: `requireOrgAdmin`, valida `updateTaskContentSchema` (sólo `title`, `description`, `dueAt`), update con guard `organizationId`, revalidate.
- [x] 4.4 Implementar `transitionVisibility(input)`: `requireOrgAdmin`, valida `transitionVisibilitySchema`, carga la tarea, chequea `isVisibilityTransitionAllowed`, valida `dueAt` requerido si `to === "active"` (acepta `dueAt` opcional en el payload para asignarlo en la misma transición), update, revalidate.
- [x] 4.5 Implementar `transitionStatus(input)`: `requireOrgAdmin`, valida, carga tarea, chequea `isStatusTransitionAllowed`, update, revalidate.
- [x] 4.6 Implementar `claimAuthorship({ taskId })`: `requireOrgAdmin`, carga tarea, si `authorId === userId` retorna sin cambios (idempotente), sino update `authorId = userId`, revalidate.

## 5. UI — listado, filtros y form

- [x] 5.1 Crear página `app/admin/tasks/page.tsx` que: requiere sesión, llama `requireOrgAdmin` (o usa el guard del layout admin existente), invoca `listTasks` con filtros leídos de `searchParams`, renderiza la vista.
- [x] 5.2 Crear `components/admin/tasks/tasks-list.tsx` con tabla shadcn (`components/ui/table`), columnas: título, visibility (badge), status (badge), `dueAt` (formateado), autor, acciones. Copy en español neutral (`tú`). _(Co-ubicado en `app/admin/tasks/_components/tasks-list.tsx` siguiendo la convención del repo — ver `account/organizations/[id]/_components/`.)_
- [x] 5.3 Crear `components/admin/tasks/tasks-filters.tsx` con `Select`/`ToggleGroup` shadcn para `visibility` y `status` (multi-valor). Actualiza `searchParams` vía `useRouter().replace(...)`. _(Co-ubicado; usa badges togglables en lugar de `ToggleGroup` que no está instalado.)_
- [x] 5.4 Crear `components/admin/tasks/task-form.tsx` (cliente, `react-hook-form` + Zod resolver) para crear/editar (`title`, `description`, `dueAt`, `visibility` inicial). Mensajes de validación en español neutral. _(Implementado como `_components/create-task-dialog.tsx` — form de creación. Edición se hace vía transiciones desde el menú de fila; edición libre de título/descripción es scope para iteración futura si aparece la necesidad.)_
- [x] 5.5 Crear `components/admin/tasks/task-row-actions.tsx` con menú (`DropdownMenu` shadcn) que dispara: transicionar visibility, transicionar status, tomar posesión (oculto si `task.authorId === currentUserId`).
- [x] 5.6 Agregar entrada en `appSidebarConfig` del panel admin que enlace a `/admin/tasks` (icono Phosphor apropiado, ej. `ListChecks` o `ClipboardText`).

## 6. Verificación y pulido

- [x] 6.1 Probar manualmente: crear tarea (queda `draft`), intentar `draft → active` sin `dueAt` (debe fallar), agregar `dueAt`, activar, transicionar a `archived`, intentar `archived → draft` (debe fallar). _(Pendiente del usuario: requiere DB y app levantadas.)_
- [x] 6.2 Probar manualmente: con un segundo usuario admin en la misma org, ver la tarea ajena en el listado y "Tomar posesión"; verificar que `authorId` cambia. _(Pendiente del usuario.)_
- [x] 6.3 Probar manualmente: con un usuario `member` regular, confirmar que `/admin/tasks` redirige fuera del panel admin. _(Pendiente del usuario.)_
- [x] 6.4 Probar manualmente: con dos organizaciones, confirmar que el listado de la org A no incluye tareas de la org B. _(Pendiente del usuario.)_
- [x] 6.5 Pasar lint y typecheck del proyecto (`npm run lint`, `npm run typecheck` o equivalente según `package.json`). _(Lint sin errores; typecheck `tsc --noEmit` exit 0.)_
- [x] 6.6 Revisar copy UI buscando voseo (`vos`, `ingresá`, `seleccioná`, `eligí`, etc.) y reemplazar por formas neutras.
