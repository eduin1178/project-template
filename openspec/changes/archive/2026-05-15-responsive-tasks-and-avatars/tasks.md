## 1. Extender queries con `user.image`

- [x] 1.1 Agregar `image: string | null` a `TaskAssigneeItem` y a `TaskListItem` (campos `authorImage` y `responsibleImage`) en `lib/tasks/queries.ts`.
- [x] 1.2 Agregar `authorImage: authorUser.image` y `responsibleImage: responsibleUser.image` al `TASK_SELECT_SHAPE` y propagar en `TaskRow` y `normalizeRow`.
- [x] 1.3 Agregar `image: user.image` al select de `attachAssignees` y poblar el campo `image` al construir `TaskAssigneeItem`.
- [x] 1.4 Agregar `image: string | null` a `OrgMemberOption` y al select de `listOrgMembers`.
- [x] 1.5 Verificar consumidores de los tipos modificados (TS compila sin errores en `next-app/`).

## 2. Renderizar foto real en avatares

- [x] 2.1 Crear helper `personImageProps(user)` o pequeño componente `<UserAvatar>` reutilizable que reciba `name`, `email`, `image` y renderice `<Avatar>` con `<AvatarImage>` (cuando hay image) + `<AvatarFallback>` con iniciales. Ubicar en `components/tasks/user-avatar.tsx`.
- [x] 2.2 Reemplazar uso de `<Avatar>` + `<AvatarFallback>` en `task-team-summary.tsx` por `<UserAvatar>` para responsable y assignees.
- [x] 2.3 Reemplazar avatar del autor en el header de `task-detail-pane.tsx` por `<UserAvatar>` consumiendo `task.authorImage`.
- [x] 2.4 Reemplazar avatares en la lista del modal en `task-assignees-panel.tsx` por `<UserAvatar>`.
- [x] 2.5 Inspeccionar `task-comments-panel.tsx` y reemplazar avatares de comentaristas por `<UserAvatar>` si la query ya provee `image` (si no, ampliar query de comentarios para incluir `image`).
- [ ] 2.6 Verificar manualmente que un usuario sin `image` sigue viendo iniciales sin warnings de React por `<img src="">`.

## 3. Mostrar email en lista de assignees y selectores

- [x] 3.1 Crear `components/tasks/person-option-item.tsx` con `<PersonOptionItem>` que renderice nombre arriba y email debajo (con tipografía secundaria), manejando el caso `name = null` mostrando solo email.
- [x] 3.2 Modificar `task-assignees-panel.tsx` lista de assignees: cada `<li>` muestra nombre + email debajo. Si `name = null` muestra solo email en la línea principal.
- [x] 3.3 Modificar `<SelectItem>` del `<Select>` de "Responsable" para envolver el contenido con `<PersonOptionItem>`. Pasar `textValue={personLabel(...)}` para que el trigger muestre solo el nombre tras la selección.
- [x] 3.4 Modificar `<SelectItem>` del `<Select>` de "Agregar al equipo de apoyo" igual que el anterior.
- [ ] 3.5 Verificar visualmente que el alto del trigger del `<Select>` no cambia y el dropdown muestra dos líneas legibles.

## 4. Reestructurar `/tasks` con layout + segmento `[taskId]`

- [x] 4.1 Extraer un helper server-side `loadTasksForRoute({ ctx, isAdmin, status })` (o similar) en `lib/tasks/queries.ts` o en un nuevo `lib/tasks/route-data.ts` que devuelva `{ tasks, counts, members }`.
- [x] 4.2 Crear `app/(app)/tasks/layout.tsx` que define el shell: `<aside hidden md:block>` con `<TasksFiltersPanel>`, contenedor flex para `children`. El layout también renderiza el botón "Filtros" mobile (ver sección 5). _(Implementado vía componente server `TasksRouteShell` reusable, en lugar de `layout.tsx`, para acceder a `searchParams` que el layout no recibe en Next 16.)_
- [x] 4.3 Reescribir `app/(app)/tasks/page.tsx` para que renderice solo la lista (con `lg:max-w-110`) más un `<DetailEmptyState hidden lg:flex flex-1>`. Implementar el redirect 308 si `searchParams.taskId` existe (usar `permanentRedirect` de `next/navigation`).
- [x] 4.4 Crear `app/(app)/tasks/[taskId]/page.tsx` que renderiza `<TasksListPanel hidden lg:flex>` + `<MobileBackButton lg:hidden>` + `<TaskDetailPane>`. Server-fetcheaa la tarea seleccionada con `getTaskByIdForViewer`; 404 si no hay permiso.
- [x] 4.5 Actualizar `app/admin/tasks/layout.tsx`, `app/admin/tasks/page.tsx` y `app/admin/tasks/[taskId]/page.tsx` con la misma estructura (incluye `<CreateTaskDialog>` en la cabecera de la lista).
- [x] 4.6 Implementar redirect 308 de `?taskId=` también en `app/admin/tasks/page.tsx`.
- [x] 4.7 Verificar la API exacta de `permanentRedirect` y de las APIs de routing en `node_modules/next/dist/docs/` antes de implementar.

## 5. Actualizar links a la nueva ruta canónica

- [x] 5.1 Actualizar `tasks-list-panel.tsx` (y/o las filas de la lista) para que cada `<Link>` apunte a `/tasks/<id>` o `/admin/tasks/<id>` (según `basePath`) preservando los searchParams de filtros.
- [x] 5.2 Buscar otros lugares en el repo que construyan URLs `?taskId=` y actualizarlos. Usar `Grep` por `taskId=` en `next-app/`.
- [x] 5.3 Actualizar la lógica de "selección actual" en la lista para que detecte la fila activa por el segmento de URL en lugar del query param (probablemente vía `usePathname`).

## 6. Filtros mobile en `<Sheet>`

- [x] 6.1 Agregar al layout (sección 4.2) un botón "Filtros" `<Button md:hidden>` que abra un `<Sheet side="left">`. El contenido del `<Sheet>` reusa `<TasksFiltersPanel>`.
- [x] 6.2 Calcular server-side el conteo de filtros activos (comparando los searchParams contra el default de la ruta) y mostrarlo como badge en el botón cuando es >0.
- [x] 6.3 Sincronizar el cierre del `<Sheet>` cuando los filtros se aplican: probar con `open` controlado y un callback `onAfterApply` desde `<TasksFiltersPanel>`. Si el panel no expone hook, derivar `open` de un state local y cerrarlo manualmente al hacer click en una opción. _(Resuelto remontando el subcomponente con `key={pathname}` para resetear estado al navegar — evita anti-patrón `setState` en `useEffect`.)_
- [x] 6.4 Verificar que el copy del botón y del `<Sheet>` ("Filtros", "Aplica", "Cierra", etc.) esté en español neutral con `tú`, sin voseo.

## 7. Botón "Volver a la lista" en mobile

- [x] 7.1 En `[taskId]/page.tsx` (tanto `/tasks` como `/admin/tasks`), renderizar arriba del `<TaskDetailPane>` un `<div className="lg:hidden border-b px-4 py-2">` con un `<Link asChild>` a la ruta de lista preservando los searchParams de filtros.
- [x] 7.2 Usar el icono `ArrowLeftIcon` de `@phosphor-icons/react` y copy "Volver a la lista" en español neutral.

## 8. Verificación y limpieza

- [x] 8.1 Verificación de tipos: `pnpm tsc --noEmit` (o el comando equivalente del repo) sin errores.
- [x] 8.2 Linter: `pnpm lint` (o equivalente) sin errores en archivos modificados. _(4 errores y 7 warnings restantes son TODOS preexistentes — no introducidos por esta change.)_
- [x] 8.3 Prueba manual desktop: navegar a `/tasks`, seleccionar una tarea (la URL pasa a `/tasks/<id>`), aplicar filtros (siguen en URL), refrescar página (state se preserva), abrir un deep-link `/tasks/<id>` directo.
- [x] 8.4 Prueba manual mobile (DevTools <1024px): la lista se muestra al abrir `/tasks`, click en tarea navega a `/tasks/<id>` y oculta la lista, botón "Volver" regresa a `/tasks` con filtros preservados.
- [x] 8.5 Prueba manual filtros mobile: abrir `<Sheet>` por el botón, aplicar filtro, el `<Sheet>` se cierra y la URL refleja el cambio.
- [x] 8.6 Prueba manual avatares: usuario con `image` muestra foto; usuario sin `image` muestra iniciales sin warnings.
- [x] 8.7 Prueba manual email en `<Select>`: dos usuarios con el mismo `name` se distinguen visualmente por email en el dropdown; el trigger del `<Select>` cerrado solo muestra el nombre del seleccionado.
- [x] 8.8 Prueba manual redirect: `/tasks?taskId=<id>` responde 308 a `/tasks/<id>`. Verificar con DevTools network o `curl -I`.
- [x] 8.9 Confirmar copy en español neutral en todos los strings nuevos (botones, tooltips, mensajes).
