## Context

La implementación actual de tareas en `next-app` ya tiene la mayoría de las piezas de dominio: rutas slug-scoped, filtros por URL, cards, detalle, checklist, comentarios, documentos, capabilities server-side y autorización por rol. El problema es de composición UX: `TasksRouteShell` sigue modelando la experiencia como bandeja lista-detalle, mientras el producto ahora necesita una experiencia visual de seguimiento y una página de detalle dedicada.

La nueva experiencia debe respetar las reglas existentes: la URL (`/[slug]/...`) sigue siendo la fuente de verdad del workspace, las server actions existentes siguen imponiendo permisos, y la UI no debe inferir capabilities inspeccionando datos sensibles como rol, `dueAt` o participación cuando ya recibe flags server-side.

## Goals / Non-Goals

**Goals:**
- Introducir dos modos de listado: tablero por estado y grilla/lista de tarjetas sin columnas.
- Mantener filtros por URL, incluyendo visibilidad para viewers autorizados a ver múltiples `visibility`.
- Convertir la ruta `[taskId]` en una página de detalle dedicada con composición responsive similar al mock adjunto.
- Reutilizar los componentes y server actions existentes donde sea razonable.
- Mantener mobile funcional: una columna, controles táctiles claros, sin dependencia de hover y sin layouts de desktop comprimidos.

**Non-Goals:**
- No agregar drag-and-drop, reordenamiento manual ni WIP limits al tablero en esta iteración.
- No cambiar el esquema de base de datos ni los estados de dominio (`pending`, `in_progress`, `done`).
- No cambiar reglas de autorización, vencimiento, comentarios, documentos o checklist.
- No persistir todavía la preferencia de modo de vista en base de datos; la URL/local state son suficientes para v1.

## Decisions

### 1. Separar vista de listado y página de detalle

La ruta base (`/[slug]/tasks` y `/[slug]/admin/tasks`) renderizará la experiencia de listado visual. La ruta con `taskId` renderizará una página de detalle dedicada, sin lista lateral en desktop.

**Alternativa considerada:** mantener `TasksRouteShell` con lista + detalle. Se descarta porque contradice el mock y obliga a meter una página de detalle dentro de una bandeja, que es arquitectura de UI equivocada.

### 2. Usar modo de vista controlado por URL

El modo de listado se representará con un search param estable, por ejemplo `view=board|cards`. Si falta o es inválido, el default será `board`.

**Rationale:** la URL permite deep-linking, back/forward consistente y no requiere persistencia nueva. También facilita pruebas.

**Alternativa considerada:** guardar la preferencia en localStorage. Es útil como mejora posterior, pero no debe ser la fuente primaria porque rompe compartibilidad de URLs.

### 3. Agrupar tablero por `status`, no por `visibility`

El tablero tendrá columnas de estado: `Pendiente`, `En curso`, `Hecha`. La visibilidad será filtro transversal, no columna.

**Rationale:** `status` representa flujo operativo; `visibility` representa exposición/publicación. Mezclarlas confunde conceptos. COMO ARQUITECTURA: no uses una pared de carga como si fuera decoración.

### 4. Filtro de visibilidad condicionado por autorización

En `/admin/tasks`, admin/owner podrá filtrar por `draft`, `active` y `archived`. En `/tasks`, un member regular seguirá viendo únicamente tareas `active` donde participa; si un admin usa `/tasks`, podrá usar filtros compatibles con su capacidad real de lectura cuando el producto decida exponerlos ahí.

**Rationale:** UX no debe prometer filtros que el backend nunca puede satisfacer para members regulares.

### 5. Detalle full-page con secciones visibles

El detalle reemplazará tabs principales por secciones visibles: descripción, checklist, documentos y comentarios. En desktop, comentarios podrán ocupar columna derecha persistente; en mobile, todo fluye en una sola columna.

**Alternativa considerada:** conservar tabs para checklist/documentos/comentarios. Se descarta para esta experiencia porque el mock prioriza visibilidad contextual y reduce navegación interna.

### 6. Reutilizar componentes existentes mediante composición

Los componentes actuales (`TaskChecklist*`, `TaskCommentsPanel`, `TaskDocumentsPanel`, acciones y dialogs) deben adaptarse para encajar en el nuevo layout antes de reescribirse.

**Rationale:** no hay que tirar una estructura de dominio funcional solo porque cambió el layout. Primero componemos; reescribimos solo si la composición queda forzada.

## Risks / Trade-offs

- **Riesgo: specs actuales contradicen el nuevo layout** → Mitigación: este cambio modifica explícitamente los requirements afectados antes de implementar.
- **Riesgo: tablero con muchas tareas puede volverse denso en mobile** → Mitigación: en mobile el modo tablero apila columnas verticalmente y el toggle a tarjetas ofrece una alternativa más simple.
- **Riesgo: filtro de visibilidad confunde a members regulares** → Mitigación: no mostrar filtro de visibility cuando el viewer solo tiene acceso efectivo a `active`.
- **Riesgo: comentarios como columna lateral reduzcan espacio en desktop mediano** → Mitigación: activar composición de dos columnas solo desde breakpoint amplio; en tamaños menores usar flujo vertical.
- **Riesgo: cambio visual grande aumente diffs** → Mitigación: implementar en slices: primero shell/listado, luego detalle full-page, luego refinamientos responsive.

## Migration Plan

1. Crear nuevos componentes de listado visual y mantener queries existentes.
2. Cambiar rutas base para usar el nuevo listado.
3. Cambiar rutas `[taskId]` para renderizar página de detalle dedicada.
4. Adaptar checklist/documentos/comentarios a secciones visibles.
5. Mantener redirects legacy de `?taskId=` hacia la ruta canónica.
6. El rollback consiste en volver a usar `TasksRouteShell` en las rutas afectadas; no hay migración de datos.

## Open Questions

- Si en una iteración posterior se quiere persistir preferencia de vista por usuario, se debe decidir si vive en perfil local, tabla de preferencias o cookie.
- Drag-and-drop entre columnas queda fuera de alcance; si se agrega después, debe diseñarse junto con la regla de comentario obligatorio para cambio de status.
