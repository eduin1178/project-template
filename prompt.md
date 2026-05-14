/opsx:explore  

## Propuesta 2 — `add-tasks-assignments-and-visibility`

**Objetivo:** Introducir el responsable y el equipo de apoyo, y el filtrado por rol según `visibility`.

**Alcance:**
- Campo `responsibleId` (un usuario de la misma organización).
- Relación `taskAssignees` (N usuarios de la misma organización).
- Acciones del autor:
  - Asignar / cambiar responsable
  - Agregar / quitar usuarios del equipo de apoyo
- Reglas de visibilidad en listados/lectura:
  - `draft` → solo autor
  - `active` → autor, responsable, asignados
  - `archived` → solo autor
- El responsable y el equipo de apoyo pueden VER la tarea cuando aplica.
- El autor puede modificar el titulo y la descripción de la tarea mientras esté en borrador.

**Fuera de alcance:** comentarios, documentos, checklist, cambios de estado por responsable.

Esto es continuación del cambio archivado add-tasks-core