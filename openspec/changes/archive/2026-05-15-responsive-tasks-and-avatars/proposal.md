## Why

La vista `/tasks` no es usable en móvil ni tablet: cuando un usuario selecciona una tarea, la URL cambia a `?taskId=...` pero el panel de detalle vive bajo `hidden lg:flex`, así que en pantallas medianas y chicas no se ve nada. Además, los avatares del equipo de la tarea muestran iniciales aunque el campo `user.image` ya existe en el schema, y los listados/selectores de participantes no muestran el email — en organizaciones con usuarios homónimos es imposible distinguirlos.

## What Changes

- Migrar `/tasks` y `/admin/tasks` a un layout con **parallel routes** (`@list` + `@detail`) y reemplazar el query param `?taskId=` por una ruta real `/(admin/)tasks/[taskId]`. Esto deja el detalle como página propia, deep-linkable, server-rendered.
- En móvil/tablet, mostrar **una sola sección a la vez**: lista cuando no hay `[taskId]`, detalle cuando lo hay (con un botón "Volver a la lista"). En desktop, mostrar lista y detalle lado a lado como hoy.
- Convertir el panel de filtros en mobile a un componente `Sheet` lateral disparado desde un botón en la barra de la lista. En desktop sigue como `aside` fijo.
- **BREAKING (interno):** El query param `?taskId=` deja de soportarse como mecanismo de navegación. Cualquier link interno que lo use debe migrarse a `/tasks/[taskId]` o `/admin/tasks/[taskId]`.
- Ampliar las queries de tareas para incluir `user.image` en autor, responsable, asignados y miembros de la organización (`TaskAssigneeItem`, `TaskListItem`, `OrgMemberOption`, `TASK_SELECT_SHAPE`, `attachAssignees`, `listOrgMembers`).
- Renderizar `<AvatarImage>` en `task-team-summary`, `task-assignees-panel`, `task-detail-pane` (autor) y comentarios cuando exista `image`; mantener iniciales como fallback.
- Mostrar el email debajo del nombre en la lista de asignados del modal de equipo, y en los `<Select>` de "Responsable" y "Agregar al equipo de apoyo" usar items de dos líneas (nombre arriba, email abajo) para distinguir homónimos.

## Capabilities

### New Capabilities

_Ninguna._ Esta change refina capacidades existentes; no introduce un dominio nuevo.

### Modified Capabilities

- `tasks-core`: La navegación a una tarea individual cambia de `?taskId=` a una ruta dedicada `/(admin/)tasks/[taskId]`, y el layout debe presentar lista y detalle como secciones cooperantes vía parallel routes con comportamiento responsivo (una sección a la vez en mobile, ambas en desktop). El filtrado en móvil debe ser accesible mediante un panel desplegable, no una columna lateral oculta.
- `task-assignments`: La presentación de los miembros del equipo (responsable y equipo de apoyo) debe mostrar la foto real del usuario cuando exista `image`, conservando iniciales como fallback. La lista de asignados y los selectores de personas deben mostrar el email para diferenciar usuarios con el mismo nombre.

## Impact

**Código afectado:**

- `next-app/app/(app)/tasks/` — reestructurado a layout + slots `@list` y `@detail` + ruta `[taskId]`.
- `next-app/app/admin/tasks/` — misma reestructuración.
- `next-app/components/tasks/` — `task-detail-pane.tsx`, `task-team-summary.tsx`, `task-assignees-panel.tsx`, `task-comments-panel.tsx` (verificar) actualizados para `<AvatarImage>` y email; nuevos componentes para Sheet de filtros mobile y botón "Volver" en detalle mobile.
- `next-app/lib/tasks/queries.ts` — `TaskAssigneeItem`, `TaskListItem`, `OrgMemberOption`, `TASK_SELECT_SHAPE`, `attachAssignees`, `listOrgMembers` extendidos con `image`.

**APIs / contratos:**

- Tipos públicos `TaskListItem`, `TaskAssigneeItem`, `OrgMemberOption` ganan campos `*Image` opcionales (no breaking para consumidores).
- Rutas: `/tasks/[taskId]` y `/admin/tasks/[taskId]` aparecen como nuevas; `?taskId=` deja de leerse.

**Dependencias:**

- Requiere `Sheet` de shadcn (verificar si ya está en `components/ui/`; si no, agregarlo vía `npx shadcn@latest add sheet`).
- Sin nuevos paquetes npm.

**Specs:** `tasks-core` y `task-assignments` (deltas).
