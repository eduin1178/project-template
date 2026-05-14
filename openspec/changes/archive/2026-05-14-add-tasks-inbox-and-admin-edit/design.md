## Context

`add-tasks-assignments-and-visibility` (archivado) habilitó la lectura de tareas para members con la ruta `/tasks` y dejó listas las server actions de edición (`updateTaskContent`), pero la UI quedó incompleta:

- `/admin/tasks` usa un shell tipo bandeja (filters | list | detail) implementado en `app/admin/tasks/_components/`.
- `/tasks` usa una lista plana (`max-w-3xl` con `TaskCard`s) y una subruta `/tasks/[taskId]` separada que renderiza un detail mínimo.
- El sidebar de `/app` (`components/layout/contexts/app.ts`) no tiene entrada a `/tasks`.
- No existe ningún componente que invoque `updateTaskContent`; admin no puede editar título, descripción ni plazo desde la UI.
- El `<Textarea rows={4}>` del `CreateTaskDialog` queda chico para descripciones reales, y el detail pane scrollea entero cuando la descripción es larga (pierde el header con título y badges).

Stack relevante: Next.js 16.2.6 (App Router con server actions), React 19, Tailwind 4, shadcn-first sobre `components/ui/`, `react-hook-form` + `zod`, Phosphor Icons. Drizzle ORM para la BD; este cambio no la toca.

## Goals / Non-Goals

**Goals:**
- Que el member en `/tasks` vea exactamente el mismo shell que el admin en `/admin/tasks`, con la lista, los filtros y el detail pane funcionando, pero respetando las restricciones de visibilidad y edición ya archivadas.
- Que el admin pueda editar `title`, `description` y `dueAt` desde la UI invocando `updateTaskContent`, con un dialog separado de la creación.
- Resolver dos issues de UX: textarea de descripción más grande y body de descripción con scroll propio (sticky header).
- Agregar la navegación a "Tareas" en el sidebar de `/app`.

**Non-Goals:**
- Editor markdown / renderer markdown. Queda para un cambio futuro.
- Cambios en schema, queries de BD o server actions. `updateTaskContent` y compañía ya implementan las reglas.
- Inline editing (click-to-edit por campo). El dialog cumple para v1.
- Comentarios reales (sigue siendo placeholder).
- Nueva auditoría o permisos. Las reglas vienen del cambio archivado.

## Decisions

### D1. Shell compartido bajo `components/tasks/`

Movemos `app/admin/tasks/_components/*` a `components/tasks/`. Cada ruta (`/admin/tasks` y `/tasks`) compone el shell pasando `capabilities` calculadas server-side.

Alternativa considerada: dejar los componentes en `app/admin/tasks/_components/` e importarlos desde `app/tasks/page.tsx`. Rechazada porque Next desalienta importar desde carpetas `_components` de otra ruta y porque `AGENTS.md` ubica composiciones de feature en `components/<feature>/`.

### D2. `TaskCapabilities` como contrato UI

Tipo en `components/tasks/capabilities.ts`:

```ts
export type TaskCapabilities = {
  canEditContent: boolean;
  canEditDueAt: boolean;
  canManageTeam: boolean;
  canTransitionVisibility: boolean;
  canTransitionStatus: boolean;
  canDelete: boolean;
  canClaim: boolean;
};
```

Calculado por un helper `computeTaskCapabilities({ task, viewer })` consumido por las pages server-side y pasado como prop al detail pane. Los componentes hijos solo leen flags; nunca recalculan rol.

Matriz (derivada del proposal archivado + Q2 de exploración):

| capability | admin/owner | autor (no admin) | responsable / assignee | otro member |
|---|---|---|---|---|
| canEditContent | ✅ siempre | ✅ solo si draft | ❌ | ❌ |
| canEditDueAt | ✅ salvo archived | ❌ | ❌ | ❌ |
| canManageTeam | ✅ | ✅ | ❌ | ❌ |
| canTransitionVisibility | ✅ | ✅ | ❌ | ❌ |
| canTransitionStatus | ✅ | ✅ | ✅ | ❌ |
| canDelete | ✅ si draft | ✅ si draft | ❌ | ❌ |
| canClaim | ✅ si no es autor | n/a | ✅ si no es autor | n/a |

Alternativa considerada: que cada componente reciba `currentUserId` + `userRole` y derive sus permisos. Rechazada porque dispersa la lógica y duplica la matriz en varios sitios.

### D3. `/tasks` colapsa a `/tasks?taskId=...`

`/tasks/[taskId]/page.tsx` se reemplaza por un redirect 308 a `/tasks?taskId=...`. Esto:

- Elimina código duplicado (otro detail mínimo).
- Mantiene paridad con `/admin/tasks` que usa `searchParams.taskId`.
- Conserva deep-links que pudieran existir.

Alternativa considerada: mantener la subruta y renderizar el mismo `TaskDetailPane` dentro. Rechazada por overhead innecesario; con un solo punto de selección, el shell se simplifica.

### D4. Filtros para member: solo `status`

`TasksFiltersPanel` acepta una prop nueva `showVisibility: boolean`. Para member, las pages pasan `showVisibility={false}` y el filtro de `visibility` no se renderiza; el listado viene fijo a `active` (vía `listTasksForMember`). El filtro de `status` se mantiene igual.

Alternativa considerada: dos componentes distintos (`FiltersAdmin`, `FiltersMember`). Rechazada por duplicación; la diferencia es una sola prop.

### D5. `EditTaskDialog` separado de `CreateTaskDialog`

Componentes distintos en `components/tasks/`. El edit no toca `visibility` (eso lo gobierna `task-detail-actions`), ni `responsibleId` (eso lo gobierna `task-assignees-panel`). Solo `title`, `description`, `dueAt`.

Campos deshabilitados según `capabilities`:
- `title` y `description`: deshabilitados si `!canEditContent`.
- `dueAt`: oculto si `!canEditDueAt` (no solo deshabilitado, porque en archived el campo no aplica).

El dialog se abre desde un botón "Editar" en el header del `TaskDetailPane`, visible solo si `canEditContent || canEditDueAt`. Llama a `updateTaskContent`.

Alternativa considerada: extender `CreateTaskDialog` con `mode: "create" | "edit"`. Rechazada por feedback explícito del usuario; los flujos divergen en campos y validación.

### D6. UX de descripción

- `CreateTaskDialog` y `EditTaskDialog`: `<Textarea>` con `rows={8}`, `className="min-h-[200px] max-h-[400px] resize-y"`.
- `TaskDetailPane`: el wrapper externo (`flex h-full flex-col`) pierde el `overflow-y-auto`. El body de descripción gana `flex-1 overflow-y-auto px-5 py-6`. Header, badges y `TaskDetailActions` quedan fijos arriba; solo el bloque de descripción scrollea.

### D7. Sidebar `/app`

`components/layout/contexts/app.ts` gana un item:

```ts
{ label: "Tareas", href: "/tasks", icon: createElement(ListChecksIcon) }
```

Igual estructura que el sidebar admin.

### D8. Paridad de `listTasksForMember` con `listTasks`

`TaskDetailPane` consume campos de `TaskListItem` (autor, responsable, assignees, dueAt, etc.). Antes de empezar a renderizar el detail para member, verificar que `listTasksForMember` y `getTaskByIdForViewer` devuelvan el mismo shape que `listTasks` / `getTaskWithAuthorById`. Si falta algún campo, ajustar las queries para igualarlo. Sin cambios al schema.

## Risks / Trade-offs

- **Imports rotos al mover componentes** → mitigado haciendo el move + ajuste de imports en un solo commit, con búsqueda exhaustiva de referencias antes del merge.
- **Filtros server-side dependen de `searchParams`; cambiar `visibility` por defecto para member puede confundir si admin compartió un link `/admin/tasks?visibility=draft`** → no aplica: cada ruta tiene su propio set de defaults; member nunca verá `draft`.
- **Capabilities mal calculadas → botones visibles que el server rechaza** → mitigado centralizando el cálculo en un único helper testeado, y dejando al server como fuente de verdad final (el helper es UX, no autorización).
- **PR grande (500–700 líneas)** → el usuario aceptó `size:exception`. Para reviewer, agrupar commits por tema (move shell, capabilities, edit dialog, sidebar, UX polish) ayuda a digerirlo.
- **`/tasks/[taskId]` deep-links** → redirect 308 los preserva; navegadores y crawlers lo respetan.
- **`TasksFiltersPanel` actualmente persiste filtros en searchParams** → mantener ese contrato; member no usa `visibility` pero sí `status`, igual que admin.

## Migration Plan

No hay migración de datos. Plan operativo:

1. Mover los `_components` a `components/tasks/` y ajustar imports en `app/admin/tasks/page.tsx` — verificar que admin sigue idéntico.
2. Introducir `capabilities.ts` y propagar el prop a los componentes que renderizan acciones (`TaskDetailActions`, `TaskRowActions`, `TaskAssigneesPanel`, `TaskTeamSummary`, `TaskDetailPane`). Reemplazar checks ad hoc de `currentUserId === authorId`.
3. Reescribir `app/tasks/page.tsx` para usar el shell con `capabilities` de member y `showVisibility={false}`.
4. Convertir `app/tasks/[taskId]/page.tsx` en redirect 308.
5. Agregar item "Tareas" al sidebar `/app`.
6. Crear `EditTaskDialog` y botón "Editar" en el detail pane.
7. Subir el textarea (`rows={8}`, `resize-y`) y hacer el body de descripción scrolleable.
8. Eliminar `components/tasks/task-readonly-list.tsx` (obsoleto).

Rollback: el cambio es UI-only; un revert del PR restaura el estado anterior. No hay migraciones de DB ni cambios en contratos públicos.

## Open Questions

- ¿`TaskCommentsPlaceholder` se muestra también en `/tasks` para member, o queda solo en admin? Default propuesto: se muestra en ambos (es un placeholder visual, no expone datos sensibles).
- ¿Necesitamos que el filtro `status` para member tenga un default distinto al admin (que hoy default-ea a `pending`)? Default propuesto: mismo `pending` para coherencia.
