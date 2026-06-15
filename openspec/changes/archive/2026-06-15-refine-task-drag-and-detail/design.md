## Context

La vista de tareas se rediseñó recientemente (change archivado
`2026-06-15-redesign-task-board-and-detail`). Sobre ese rediseño surgen tres
ajustes de UX. El más sensible deroga una regla que las specs `tasks-core` y
`task-board-view` consagran como "requisito universal de trazabilidad": todo
cambio de estado exige un `commentBody` de ≥30 caracteres. Esta decisión de
producto fue tomada explícitamente por el equipo (ver `tareas.md`, punto 1).

## Goals / Non-Goals

**Goals**
- Drag-and-drop sin fricción: un drop válido cambia el estado de inmediato.
- Eliminar el bug de "la card no se mueve hasta recargar".
- Detalle más compacto: checklist/documentos en tabs, acciones en una línea.
- Una sola fuente de acciones en el detalle (sin duplicación).

**Non-Goals**
- No se cambian permisos, autorización, reglas de transición ni el gate de
  vencimiento.
- No se toca el esquema de base de datos.
- No se elimina la capacidad de comentar un cambio de estado: sigue disponible
  de forma opcional desde el detalle.

## Decision 1 — `commentBody` opcional, action sigue siendo única vía

`changeTaskStatusSchema` cambia `commentBody` de requerido a
`z.string().trim().max(2000).optional()` (sin mínimo). La action:

- Si `commentBody` llega y tras `trim` no está vacío → inserta `task_comment` y
  actualiza `status` en la misma transacción (comportamiento actual).
- Si no llega o queda vacío → solo actualiza `status` (sin insertar comentario),
  dentro de transacción.

Se conserva: autorización, `isStatusTransitionAllowed`, bloqueo `pending → done`,
gate de vencimiento, atomicidad y `revalidateTaskPaths()`.

```
changeTaskStatus(taskId, newStatus, commentBody?)
   ├─ valida permisos / transición / vencimiento  (igual que hoy)
   ├─ tx:
   │    ├─ if commentBody?.trim() → insert task_comment
   │    └─ update task.status
   └─ revalidateTaskPaths()
```

**Tradeoff:** se pierde la garantía de trazabilidad textual por cambio. Se
acepta a cambio de fluidez operativa; la trazabilidad queda como opción, no como
obligación. El historial sigue existiendo cuando el usuario decide comentar.

## Decision 2 — Drag con actualización optimista (no diálogo)

`BoardView` mantiene una copia local de `tasks` (estado cliente sembrado desde
props). En `onDragEnd` válido:

1. Se valida en cliente igual que hoy (misma columna, `pending → done`,
   visibilidad `active`, transición permitida).
2. Se aplica el nuevo `status` a la copia local (la card salta de columna).
3. Se llama `changeTaskStatus({ taskId, newStatus })` sin comentario.
4. Si la action falla → se revierte la card a su columna previa y se muestra
   `toast.error`. Si tiene éxito → la copia local ya es correcta; el
   `revalidatePath` del servidor reconcilia en la próxima navegación.

```
drop válido ─▶ mover card en estado local (optimista)
                     │
                     ├─ changeTaskStatus(taskId, newStatus)   [sin comentario]
                     │        ├─ ok    → queda como está
                     │        └─ error → revertir card + toast
```

**Por qué copia local:** hoy `BoardView` deriva columnas directo de la prop
`tasks` y depende de `router.refresh()` para ver el cambio — que falla. Con
copia local el movimiento es instantáneo y no depende del refetch. Hay que
sincronizar la copia local cuando cambien las props (cambio de filtros/orden)
vía `useEffect` o key derivada para no quedar desactualizada.

**Alternativa descartada:** arreglar solo el `router.refresh()` (p. ej. mover el
`setStatusIntent(null)` después del refetch). Resolvería el bug pero deja la
fricción del diálogo; no cumple el requisito del punto 1.

## Decision 3 — Checklist y documentos como tabs

En el detalle, bajo la `SectionCard` de descripción, se reemplazan las dos
`SectionCard` (Checklist, Documentos) por un contenedor con `Tabs` de shadcn
(`@/components/ui/tabs`, ya instalado).

- Labels con conteo: `Checklist · {n}`, `Documentos · {n}`.
- Comentarios permanece como `aside` lateral en desktop, sin cambios.
- Se fija una altura mínima estable compartida para evitar saltos de layout al
  cambiar de tab (documentos hoy usa `h-[28rem]`).

## Decision 4 — Consolidar acciones del detalle en la línea de metadatos

Hoy las acciones están duplicadas:
- `TaskRowActions`: dropdown `⋮` en el header (visibilidad/estado/claim/delete).
- `TaskDetailActions`: fila de botones bajo la línea de metadatos (mismas).

Se consolida en una sola fuente, ubicada a la derecha de la línea de metadatos:

```
┌────────────────────────────────────────────────────────┐
│ [Activa][Pendiente][Vencida]  ·  Plazo   [Primaria][ ⋮ ] │
└────────────────────────────────────────────────────────┘
```

- **Botones primarios (1-2):** la acción de estado contextual (Iniciar / Marcar
  como hecha / Reabrir) y, si aplica, la acción de visibilidad primaria
  (Activar para `draft`). Visibles inline desde `sm`/`lg`.
- **Overflow `⋮`:** el resto (archivar/reactivar, tomar posesión, eliminar y las
  transiciones de visibilidad secundarias).
- Se elimina `TaskDetailActions` como fila separada y se retira el `⋮` del
  header; queda una única implementación. El header conserva solo
  `TaskTeamSummary` y "Editar".

**Mobile:** la línea usa `flex-wrap`; badges y plazo arriba, acciones alineadas
a la derecha que bajan a segunda fila si no caben. Las acciones primarias pueden
colapsar dentro del `⋮` bajo `sm` para mantener orden táctil. Se respeta tamaño
táctil mínimo y no se depende de hover (regla de `task-board-view`, responsive).

## Risks

- **Reconciliación optimista vs filtros:** si la copia local no se resincroniza
  al cambiar props (filtros/orden/refetch), puede mostrar estado obsoleto.
  Mitigación: efecto de sincronización por identidad de `tasks`.
- **Pérdida de trazabilidad:** auditorías futuras tendrán menos comentarios de
  cambio de estado. Aceptado por decisión de producto; mitigable reactivando el
  comentario opcional con un nudge.
