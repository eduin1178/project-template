## Context

La vista de tareas ya usa una experiencia visual con `board` como modo predeterminado y `cards` como alternativa. El código actual conserva defaults de estado (`pending` para admin, `pending + in_progress` para member) que reducen el valor del tablero porque ocultan columnas/tareas salvo que el usuario limpie filtros.

También existe un `Sheet` de filtros unificado que nació para agrupar `visibility` y `status`, pero la nueva dirección de producto simplifica la barra superior: el filtro operativo directo será `visibility`, mientras el estado se representa principalmente por columnas del board. El selector de vista hoy son dos botones; se reemplazará por un dropdown único para reducir ruido visual.

La restricción más delicada es drag-and-drop. Las specs actuales prohíben DnD y `tasks-core` exige que `changeTaskStatus(taskId, newStatus, commentBody)` sea la única vía para mutar `task.status`. Por eso el diseño NO debe convertir DnD en atajo silencioso: el drop solo inicia una intención de transición y la confirmación sigue pasando por la action existente con comentario obligatorio.

## Goals / Non-Goals

**Goals:**

- Mostrar todas las tareas/columnas por defecto en el tablero cuando no haya filtro `status` explícito.
- Mantener `board` como vista predeterminada y permitir cambiar a `cards` desde un dropdown único.
- Reemplazar el filtro modal/Sheet por un dropdown multiselect de `visibility` cuando aplique.
- Reubicar la acción de volver dentro de la card principal del detalle full-page sin perder accesibilidad.
- Permitir drag-and-drop entre columnas del board como gesto de cambio de estado trazable.
- Reutilizar `changeTaskStatus` para toda mutación real de `status`, preservando comentario obligatorio, permisos, validaciones y transacción.

**Non-Goals:**

- No se agrega drag-and-drop en modo `cards`.
- No se cambia el modelo de datos de tareas.
- No se elimina la server action existente de cambio de estado.
- No se relaja el comentario obligatorio ni la regla que bloquea `pending → done` directo.
- No se introduce reordenamiento manual dentro de columnas; el orden sigue siendo el orden default de listado.

## Decisions

### 1. Ausencia de `status` significa “sin filtro de estado”

El estado URL `status` seguirá siendo soportado cuando exista, pero las rutas base no inyectarán defaults de estado. En `loadTasksRouteData`, si `status` no está presente, `status` será `[]`; las queries ya interpretan arrays vacíos como “no agregar condición `WHERE status IN (...)`”.

Alternativas consideradas:

- **Mantener defaults actuales:** preserva comportamiento viejo, pero contradice el valor del tablero como vista global.
- **Forzar `status=pending,in_progress,done` en URL:** muestra todo, pero ensucia URLs y hace parecer que hay filtros activos cuando no los hay.
- **Usar `[]` como ausencia de filtro:** más limpio; aprovecha la implementación existente de queries. Esta es la decisión.

### 2. Filtro directo de `visibility`, no Sheet de filtros

El control de filtros del listado se simplifica a un dropdown multiselect con checkboxes para `draft`, `active` y `archived` cuando el viewer puede filtrar más de una visibilidad. Para member regular, no se renderiza control editable porque su listado efectivo está fijado a tareas `active` visibles.

Alternativas consideradas:

- **Combobox searchable:** innecesario para tres opciones fijas. Sería sobreingeniería.
- **Mantener Sheet:** respeta la spec anterior, pero agrega una interacción extra para un filtro pequeño.
- **DropdownMenu con CheckboxItem:** encaja con shadcn/Radix existente, requiere poco peso y es accesible. Esta es la decisión.

### 3. Dropdown único para modo de vista

`TasksViewToggle` se reemplaza por un selector basado en `DropdownMenu`. El trigger comunica el valor actual (`Vista: Tablero` o `Vista: Tarjetas`) y cada item navega preservando search params, igual que hoy.

Alternativas consideradas:

- **Dos botones segmentados:** explícito, pero ocupa más espacio y compite con filtros/crear tarea.
- **Select nativo:** simple, pero menos consistente con el sistema shadcn/Radix y navegación por Link.
- **DropdownMenu:** consistente con la UI instalada y flexible para iconos. Esta es la decisión.

### 4. Drag-and-drop es intención, no mutación directa

Al arrastrar una card a otra columna, el componente board guarda una intención `{taskId, fromStatus, toStatus}`. Antes de invocar el servidor, valida rápido en UI que el destino sea distinto y que no sea `pending → done`. Si la intención es potencialmente válida, abre un diálogo de justificación.

Al confirmar, el diálogo llama `changeTaskStatus(taskId, toStatus, commentBody)`. El servidor sigue siendo fuente de verdad: permisos, vencimiento, transición inválida y comentario mínimo se validan ahí. Si la action falla, la tarjeta se mantiene o vuelve a su columna original tras refresh/revalidación.

Alternativas consideradas:

- **Mutar estado inmediatamente al drop:** rápido, pero rompe trazabilidad y la spec de dominio. Rechazado.
- **Pedir comentario antes de permitir drag:** fricción innecesaria.
- **Abrir diálogo después del drop:** respeta la intención natural del usuario y conserva reglas. Esta es la decisión.

### 5. Librería de drag-and-drop

Preferencia técnica: usar `@dnd-kit/core` y, si hace falta, `@dnd-kit/sortable` solo para sensores/estructura, no para persistir orden. Razones: soporte de pointer/keyboard sensors, API declarativa, buena integración React y accesibilidad mejor que HTML5 DnD puro.

Tradeoff: agrega dependencia. Si se decide evitar dependencia, se puede implementar con HTML Drag and Drop nativo, pero se pierde calidad en touch/keyboard y la implementación manual será más frágil. Para una app educativa usada en distintos dispositivos, la dependencia pequeña está justificada.

### 6. Botón volver dentro del header del detalle

El botón volver se mueve al header de `TaskFullPageDetail`, antes del bloque de título/autor. Puede ser icon-only en desktop/mobile, pero siempre debe tener `aria-label="Volver al listado"` y conservar `backHref` para mantener filtros y modo.

## Risks / Trade-offs

- **Riesgo: DnD puede sugerir que el cambio ya ocurrió antes de confirmar.** → Mitigación: no aplicar optimistic update definitivo; mostrar diálogo inmediatamente y refrescar tras éxito.
- **Riesgo: conflicto entre validación rápida de UI y validación server-side.** → Mitigación: la UI solo mejora feedback; el servidor sigue siendo autoridad.
- **Riesgo: agregar dependencia DnD aumenta superficie de mantenimiento.** → Mitigación: encapsular DnD dentro del board/listado y no filtrar la librería al dominio.
- **Riesgo: quitar filtro de estado visible reduce control para usuarios avanzados.** → Mitigación: el board ya separa por columnas; `status` URL puede seguir siendo honrado si llega por links existentes, pero no será filtro primario por defecto.
- **Riesgo: dropdown multiselect debe cerrar/no cerrar correctamente al seleccionar varias opciones.** → Mitigación: usar checkbox items controlados y navegación por URL; probar selección, limpieza y preservación de `view`.

## Migration Plan

1. Actualizar specs para reemplazar el contrato anterior de Sheet/no-DnD.
2. Cambiar defaults de rutas a arrays vacíos de estado.
3. Reemplazar controles UI de filtros/vista.
4. Introducir DnD encapsulado en el board y diálogo de justificación.
5. Validar con lint/tests disponibles; no ejecutar build porque la regla del repo lo prohíbe.

Rollback: revertir los componentes de toolbar y board a sus versiones previas; como no hay migración de datos, el rollback es de código solamente.

## Open Questions

- Si se aprueba usar `@dnd-kit`, la implementación deberá agregar dependencia en `next-app/package.json` y actualizar el lockfile con `pnpm add` desde `next-app/`.
- El filtro `status` existente en URL se mantendrá inicialmente como compatibilidad pasiva; si producto quiere eliminarlo completamente, debe hacerse en otro cambio porque afectaría deep links existentes.
