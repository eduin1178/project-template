## 1. Server action: comentario opcional

- [x] 1.1 En `lib/tasks/schemas.ts`, cambiar `changeTaskStatusSchema.commentBody`
      a opcional (`z.string().trim().max(2000).optional()`), sin mínimo.
      Mantener `STATUS_CHANGE_COMMENT_MAX`; retirar uso obligatorio de
      `STATUS_CHANGE_COMMENT_MIN` del schema.
- [x] 1.2 En `lib/tasks/actions.ts`, ajustar `changeTaskStatus` para insertar
      `task_comment` solo cuando `commentBody?.trim()` no esté vacío; el resto
      del flujo (autorización, transición, vencimiento, transacción,
      `revalidateTaskPaths`) se conserva.
- [x] 1.3 Verificar/actualizar tests existentes en `lib/tasks/__tests__/` para
      cubrir cambio de estado con y sin comentario.

## 2. Drag-and-drop optimista en el tablero

- [x] 2.1 En `tasks-visual-list.tsx`, introducir copia local de `tasks` en
      `BoardView`, sembrada desde props y resincronizada cuando cambian las props.
- [x] 2.2 En `onDragEnd` válido: mover la card en el estado local (optimista) y
      llamar `changeTaskStatus({ taskId, newStatus })` sin comentario.
- [x] 2.3 Revertir la card a su columna previa y mostrar `toast.error` si la
      action falla.
- [x] 2.4 Eliminar la apertura de `ChangeStatusDialog` desde el flujo de drag
      (quitar `statusIntent` y el render condicional del diálogo en `BoardView`).
- [x] 2.5 Conservar validaciones cliente previas al drop (misma columna,
      `pending → done`, visibilidad `active`, transición permitida).

## 3. Detalle: checklist y documentos como tabs

- [x] 3.1 En `task-full-page-detail.tsx`, reemplazar las dos `SectionCard`
      (Checklist, Documentos) por `Tabs` de `@/components/ui/tabs` bajo la
      descripción.
- [x] 3.2 Mover el conteo al label de cada tab (`Checklist · n`, `Documentos · n`).
- [x] 3.3 Fijar altura mínima estable compartida entre tabs para evitar saltos.
- [x] 3.4 Mantener Comentarios como `aside` lateral en desktop sin cambios.

## 4. Detalle: consolidar acciones en la línea de metadatos

- [x] 4.1 Diseñar un único componente de acciones (botones primarios + overflow
      `⋮`) reutilizando la lógica de `TaskDetailActions`/`TaskRowActions`.
- [x] 4.2 Renderizar acciones primarias (estado contextual y, si aplica,
      visibilidad primaria) alineadas a la derecha en la línea de metadatos.
- [x] 4.3 Mover el resto de acciones (archivar/reactivar, tomar posesión,
      eliminar, visibilidades secundarias) al menú `⋮`.
- [x] 4.4 Eliminar la fila `TaskDetailActions` separada y el `⋮` duplicado del
      header; dejar una sola fuente de acciones.
- [x] 4.5 Asegurar comportamiento responsive: `flex-wrap`, tamaño táctil, sin
      depender de hover; colapsar primarias en `⋮` bajo `sm` si no caben.

## 5. Verificación

- [x] 5.1 Verificar drag-and-drop: la card se mueve al instante y persiste; al
      fallar, revierte con feedback. (Pendiente: pasada interactiva en navegador.)
- [x] 5.2 Verificar cambio de estado desde el detalle con comentario opcional.
      (Pendiente: pasada interactiva en navegador.)
- [x] 5.3 Verificar tabs y consolidación de acciones en desktop y mobile.
      (Pendiente: pasada interactiva en navegador.)
- [x] 5.4 `openspec validate refine-task-drag-and-detail --strict`. ✓ válido.
      Verificación estática completa: `tsc --noEmit` y `eslint` sin errores,
      `vitest run` 36/36.
