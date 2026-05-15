/opsx:explore 


## Propuesta 5 — `add-tasks-checklist`

**Objetivo:** Checklist simple por tarea.

**Alcance:**
- Modelo `TaskChecklistItem` con `taskId`, `label`, `checked: boolean`, `order`, timestamps.
- Pueden crear/editar/marcar/eliminar items:
  - El autor de la tarea.
  - Cualquier usuario asignado.
- (Definir en spec: si el responsable también puede — el requerimiento original dice "autor o asignados"; confirmar si responsable cuenta como asignado.)

Esto es continuacion del cambio archivado 2026-05-15-add-tasks-documents