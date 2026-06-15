## Why

La vista de tareas ya evolucionó hacia un tablero como experiencia predeterminada, pero conserva decisiones de una etapa anterior: filtra estados por defecto, usa controles dispersos o demasiado indirectos y prohíbe explícitamente drag-and-drop. Eso limita la utilidad real del tablero: un tablero que no permite mover tarjetas es visualmente familiar, pero operacionalmente incompleto.

Este cambio busca mejorar la experiencia del listado sin romper las reglas de dominio existentes: los cambios de estado seguirán pasando por la acción trazable con comentario obligatorio.

## What Changes

- Reubicar el botón de volver del detalle full-page dentro de la card principal del detalle, usando una acción compacta/accesible que preserve la navegación de regreso con filtros y modo de vista.
- Eliminar el filtro de estado aplicado por defecto en las rutas de listado de tareas para que el modo `board` muestre todas las columnas y la consulta a base de datos no limite resultados sin un filtro explícito.
- Reemplazar el panel/Sheet de filtros por un control directo de visibilidad como dropdown multiselect con checkboxes cuando el usuario tenga permisos para filtrar por visibilidad.
- Reemplazar el toggle de dos botones `Tablero`/`Tarjetas` por un único dropdown de selección de vista, manteniendo `board` como modo predeterminado.
- Habilitar drag-and-drop de cards en modo tablero para proponer cambios de `status` entre columnas.
- El drag-and-drop NO cambiará estado silenciosamente: al soltar una card en otra columna se deberá abrir un diálogo de justificación y confirmar mediante la server action existente `changeTaskStatus(taskId, newStatus, commentBody)`.
- Mantener intactas las reglas de dominio: permisos, bloqueo de transición directa `pending → done`, comentario obligatorio de 30 a 2000 caracteres, transacción atómica y rollback completo si falla la acción.
- No introducir drag-and-drop en modo `cards`.

## Capabilities

### New Capabilities

- _Ninguna_: el cambio amplía la experiencia del capability existente de tablero/listado de tareas, sin introducir un dominio nuevo.

### Modified Capabilities

- `task-board-view`: cambia el contrato visual/interactivo del tablero: filtros directos, selector de vista por dropdown y drag-and-drop trazable entre columnas.
- `tasks-core`: cambia el comportamiento esperado de la UI de filtros del listado admin y aclara que drag-and-drop es solo un disparador UI de la acción existente de transición de estado.\n- `task-assignments`: ajusta la ruta `/tasks` para que el listado de participación use los nuevos controles directos y el tablero sin filtro de estado por defecto.

## Impact

- `next-app/app/[slug]/admin/tasks/page.tsx`: default de filtros de estado para admin.
- `next-app/app/[slug]/(member)/tasks/page.tsx`: default de filtros de estado para member.
- `next-app/app/[slug]/admin/tasks/[taskId]/page.tsx` y `next-app/app/[slug]/(member)/tasks/[taskId]/page.tsx`: navegación de regreso se mantiene, pero el botón se reubica en el componente de detalle.
- `next-app/components/tasks/task-full-page-detail.tsx`: composición del header de detalle y botón volver.
- `next-app/components/tasks/tasks-visual-shell.tsx`: reemplazo del entrypoint de filtros y selector de vista.
- `next-app/components/tasks/tasks-filters-panel.tsx` / `tasks-shell.tsx`: posible remoción o reducción del Sheet de filtros para este listado.
- `next-app/components/tasks/tasks-view-toggle.tsx`: reemplazo por dropdown de vista.
- `next-app/components/tasks/tasks-visual-list.tsx`: soporte drag-and-drop en modo board y diálogo de confirmación con comentario.
- `next-app/lib/tasks/route-data.ts`: conteo de filtros activos y semántica de ausencia de `status`.
- Posible nueva dependencia de drag-and-drop si no se implementa con APIs nativas; debe elegirse con cuidado para no sobrecargar la app.

