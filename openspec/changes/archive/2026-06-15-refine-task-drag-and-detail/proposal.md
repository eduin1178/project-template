## Why

Tres correcciones reportadas en `openspec/tareas.md` apuntan al mismo objetivo:
reducir fricción y arreglar comportamiento en la vista de tareas rediseñada.

1. **Drag-and-drop pesado y con bug de refresco.** Al soltar una card en otra
   columna se abre un diálogo que OBLIGA a escribir una justificación de mínimo
   30 caracteres. Tras confirmar, el estado cambia en base de datos pero la card
   no se mueve en el tablero hasta recargar la página (el `router.refresh()`
   queda huérfano al cerrarse el diálogo en el mismo tick). El usuario percibe
   el flujo como lento y roto.
2. **Detalle con secciones apiladas.** Checklist y documentos se muestran como
   dos `SectionCard` apiladas bajo la descripción, alargando la página.
3. **Acciones duplicadas y desordenadas en el detalle.** Las mismas acciones
   (cambiar visibilidad/estado, tomar posesión, eliminar) existen DOS veces: en
   un dropdown `⋮` del header (`TaskRowActions`) y en una fila de botones
   (`TaskDetailActions`) bajo la línea de metadatos. Eso desperdicia espacio
   vertical y confunde sobre dónde está cada acción.

## What Changes

- **Drag-and-drop como cambio rápido de estado.** Soltar una card en una
  columna de estado válida SHALL mutar `task.status` directamente, con
  **actualización optimista** (la card se mueve al instante) y reconciliación
  contra el servidor. Se elimina el diálogo de justificación en el flujo de
  drag. La actualización optimista hace innecesario el `router.refresh()` que
  hoy falla, corrigiendo el bug de raíz.
- **`commentBody` pasa a opcional en `changeTaskStatus`.** La server action
  sigue siendo la única vía para mutar `task.status`, conserva autorización,
  reglas de transición, bloqueo `pending → done`, gate de vencimiento y
  atomicidad. Cuando recibe un `commentBody` válido inserta el comentario;
  cuando no lo recibe, cambia el estado sin comentario.
- **Diálogo de justificación solo en el detalle.** La acción "Cambiar estado"
  del detalle conserva el campo de comentario para quien quiera dejar
  trazabilidad; deja de ser un bloqueo obligatorio.
- **Checklist y documentos como tabs.** En el detalle, bajo la descripción,
  checklist y documentos se presentan como pestañas (`Tabs` de shadcn) en lugar
  de secciones apiladas. El conteo se traslada al label de cada tab.
- **Acciones del detalle consolidadas.** Las acciones primarias (1-2 según
  estado/visibilidad) se renderizan como botones alineados a la derecha en la
  MISMA línea de metadatos (estado, visibilidad, plazo); el resto vive en un
  único menú `⋮`. Se elimina la duplicación entre `TaskRowActions` y
  `TaskDetailActions`. En mobile la línea colapsa de forma táctil sin romper.
- **BREAKING (regla de producto):** se deroga el "comentario obligatorio
  universal de trazabilidad" para cambios de estado. La justificación pasa a ser
  opcional en toda vía, incluido admin/owner.

## Capabilities

### Modified Capabilities
- `tasks-core`: `changeTaskStatus` acepta `commentBody` opcional; se elimina la
  regla de comentario obligatorio universal; el drag-and-drop deja de exigir
  comentario; el detalle full-page consolida acciones en la línea de metadatos
  y presenta checklist/documentos como tabs.
- `task-board-view`: el drag-and-drop muta el estado directamente con
  actualización optimista y reconciliación, sin diálogo de justificación.
- `task-checklist`: el checklist se presenta como tab dentro del detalle.
- `task-documents`: los documentos se presentan como tab dentro del detalle.

## Impact

- `next-app/lib/tasks/schemas.ts`: `commentBody` opcional en
  `changeTaskStatusSchema`.
- `next-app/lib/tasks/actions.ts`: `changeTaskStatus` inserta comentario solo si
  llega `commentBody` válido.
- `next-app/components/tasks/tasks-visual-list.tsx`: drop optimista + llamada
  directa a la action; se elimina la apertura del diálogo en drag.
- `next-app/components/tasks/change-status-dialog.tsx`: comentario opcional.
- `next-app/components/tasks/task-full-page-detail.tsx`: tabs checklist/docs y
  consolidación de acciones en la línea de metadatos.
- `next-app/components/tasks/task-detail-actions.tsx` y `task-row-actions.tsx`:
  se fusionan en una sola fuente de acciones (botones primarios + overflow).
- No cambia el esquema de base de datos ni las reglas de autorización.
