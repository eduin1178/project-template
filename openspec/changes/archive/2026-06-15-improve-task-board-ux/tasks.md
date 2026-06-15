## 1. Defaults y navegación base

- [x] 1.1 Cambiar defaults de `status` en `next-app/app/[slug]/admin/tasks/page.tsx` para que admin no filtre por estado cuando la URL no trae `status`.
- [x] 1.2 Cambiar defaults de `status` en `next-app/app/[slug]/(member)/tasks/page.tsx` para que member no filtre por estado cuando la URL no trae `status`.
- [x] 1.3 Revisar `next-app/lib/tasks/route-data.ts` para asegurar que ausencia de `status` produce `[]`, no un filtro implícito.
- [x] 1.4 Ajustar `countActiveFilters` para que solo cuente filtros realmente visibles/activos bajo la nueva toolbar.

## 2. Botón volver en detalle full-page

- [x] 2.1 Mover la acción de volver al listado dentro del header/card principal en `next-app/components/tasks/task-full-page-detail.tsx`.
- [x] 2.2 Convertir el botón en acción compacta o icon-only con `aria-label="Volver al listado"` si el texto visible se elimina.
- [x] 2.3 Verificar que `backHref` sigue preservando `view`, `visibility`, `status` y cualquier search param compatible.

## 3. Toolbar de listado

- [x] 3.1 Reemplazar el `FiltersTrigger`/Sheet como entrypoint principal por un dropdown multiselect de `visibility` con checkboxes.
- [x] 3.2 Implementar el dropdown de visibilidad preservando `view` y limpiando `taskId` al aplicar filtros.
- [x] 3.3 Ocultar el dropdown de visibilidad cuando `showVisibility = false` o el viewer no pueda filtrar múltiples visibilidades.
- [x] 3.4 Reemplazar `TasksViewToggle` por un dropdown único de vista que preserve search params y mantenga `board` como default.
- [x] 3.5 Retirar o dejar de usar componentes de Sheet/filtros que queden obsoletos para el listado de tareas.

## 4. Drag-and-drop trazable del board

- [x] 4.1 Agregar la dependencia DnD aprobada en `next-app` si se usa `@dnd-kit` y actualizar el lockfile correspondiente.
- [x] 4.2 Encapsular el comportamiento DnD dentro del modo `board` de `next-app/components/tasks/tasks-visual-list.tsx` o componentes derivados.
- [x] 4.3 Crear drop zones por columna de `status` y hacer que las cards sean arrastrables solo en modo `board`.
- [x] 4.4 Rechazar en UI drops sobre la misma columna y transición directa `pending → done` antes de abrir diálogo.
- [x] 4.5 Crear diálogo de justificación para la intención de cambio de estado con validación de comentario mínimo/máximo coherente con `changeTaskStatus`.
- [x] 4.6 Invocar exclusivamente `changeTaskStatus(taskId, toStatus, commentBody)` al confirmar el diálogo.
- [x] 4.7 Manejar éxito con refresh/revalidación del tablero y manejar error revirtiendo la intención visual con feedback al usuario.
- [x] 4.8 Asegurar que modo `cards` no renderiza sensores, drop targets ni affordances de DnD.

## 5. Pruebas y validación sin build

- [x] 5.1 Agregar o actualizar pruebas de `parseTaskListViewMode`, defaults de ruta y conteo de filtros si existe cobertura cercana.
- [x] 5.2 Agregar pruebas unitarias o de componente para el rechazo de transición `pending → done` desde DnD si la infraestructura lo permite.
- [x] 5.3 Ejecutar verificación permitida del subproyecto, preferentemente `pnpm lint` y pruebas relevantes desde `next-app`; NO ejecutar build.
- [x] 5.4 Revisar manualmente que el copy visible usa español neutral y que no aparece voseo.

## Review Workload Forecast

- Estimated changed lines: 350-550
- 400-line budget risk: High
- Chained PRs recommended: Yes
- Decision needed before apply: Yes
- Suggested slices:
  - Slice 1: defaults de estado, botón volver y dropdown de vista.
  - Slice 2: dropdown multiselect de visibilidad y limpieza de Sheet obsoleto.
  - Slice 3: drag-and-drop trazable con diálogo y pruebas.
