## Why

La experiencia actual de tareas funciona como una bandeja lista-detalle, pero el producto necesita una vista más visual y operativa para seguimiento educativo: tablero por estado, tarjetas claras y una página de detalle que concentre descripción, checklist, documentos y comentarios sin obligar al usuario a navegar entre tabs. El cambio también corrige la tensión entre la ruta dedicada de detalle y el layout actual que todavía mantiene una lista lateral en desktop.

## What Changes

- Reemplazar la lista lineal principal de tareas por una experiencia visual con dos modos alternables:
  - tablero por estado (`Pendiente`, `En curso`, `Hecha`), y
  - grilla/lista de tarjetas sin columnas.
- Mantener filtros de tareas, incluyendo filtro por `visibility` cuando el viewer tenga acceso a más de una visibilidad; para miembros regulares la visibilidad sigue limitada por autorización a tareas `active` visibles.
- Convertir `/[slug]/tasks/[taskId]` y `/[slug]/admin/tasks/[taskId]` en páginas de detalle dedicadas, inspiradas en el mock adjunto: header de tarea, metadatos, descripción, checklist, documentos adjuntos y comentarios en una composición responsive.
- Reorganizar el detalle para priorizar lectura y acción: secciones visibles en desktop, comentarios como columna lateral cuando haya espacio, y flujo vertical en mobile.
- Preservar las reglas de autorización, capabilities, server actions, rutas por slug, filtros en URL y deep-linking existentes.
- **BREAKING**: el contrato visual de desktop deja de ser lista + detalle en paralelo para la ruta `[taskId]`; el detalle pasa a ser una página dedicada.

## Capabilities

### New Capabilities
- `task-board-view`: cubre los modos visuales de listado de tareas, el toggle tablero/tarjetas, agrupación por estado, filtros aplicables y comportamiento responsive de la vista principal.

### Modified Capabilities
- `tasks-core`: cambia el contrato de layout de tareas, la ruta dedicada de detalle y la presentación del detalle full-page.
- `task-assignments`: ajusta la presentación de `/tasks` para convivir con tablero/tarjetas y con filtros de visibilidad solo cuando la autorización lo permite.
- `task-checklist`: mueve el checklist desde un tab dedicado hacia una sección visible dentro del detalle full-page.
- `task-comments`: mueve comentarios hacia una columna/panel visible del detalle en desktop y sección vertical en mobile, manteniendo composer y reglas existentes.
- `task-documents`: mueve documentos desde tab dedicado hacia una sección visible de adjuntos dentro del detalle full-page.

## Impact

- Afecta rutas de Next.js en `next-app/app/[slug]/(member)/tasks/**` y `next-app/app/[slug]/admin/tasks/**`.
- Afecta componentes de tareas en `next-app/components/tasks/**`, especialmente shell/listado, tarjetas, filtros, detalle, checklist, comentarios y documentos.
- Afecta specs OpenSpec de tareas para alinear el plano funcional con el nuevo comportamiento UX.
- No introduce nuevas dependencias obligatorias ni cambia server actions, esquema de base de datos o reglas de autorización.
