# Plan de partición OpenSpec — Módulo de Tareas

Los requerimientos del archivo `prompt.md` definen un sistema de gestión de tareas dentro de una organización, con múltiples roles, transiciones de estado, permisos granulares, documentos, comentarios y checklists. Es demasiado para una sola propuesta. Abajo se agrupa por capacidades cohesivas, cada una candidata a su propio `openspec propose`.

El orden propuesto respeta dependencias: cada propuesta posterior asume las capabilities introducidas por las anteriores.

---

## Propuesta 1 — `add-tasks-core`

**Objetivo:** Introducir la entidad `Task` con sus atributos base y el CRUD del autor (admin de la organización).

**Alcance:**
- Modelo `Task` con atributos:
  - `title`, `description`, `dueAt` (plazo: fecha + hora)
  - `visibility` ∈ { `draft`, `active`, `archived` } — default `draft`
  - `status` ∈ { `pending`, `in_progress`, `done` } — default `pending`
  - `authorId`, `organizationId`, timestamps
- Solo usuarios admin de la organización pueden crear tareas.
- Acciones del autor sobre la tarea (sin documentos, comentarios, asignaciones ni checklist todavía):
  - Crear, editar título/descripción
  - Modificar `dueAt`
  - Modificar `visibility` (respetando transiciones)
  - Modificar `status` (respetando transiciones)
- Transiciones válidas de `visibility`:
  - `draft → active` ✔
  - `active → archived` ✔
  - `active → draft` ✔
  - `archived → active` ✔
  - Bloqueadas: `draft → archived`, `archived → draft`
- Transiciones válidas de `status`:
  - Todas permitidas EXCEPTO `pending → done` directo.
- Vista/listado base: el autor ve sus propias tareas.

**Fuera de alcance (otras propuestas):** asignaciones, documentos, comentarios, checklist, enforcement de plazo.

**Dependencias previas en el repo:** `account-shell`, organización (Better Auth org plugin) ya presentes.

---

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

**Depende de:** Propuesta 1.

---

## Propuesta 3 — `add-tasks-comments`

**Objetivo:** Comentarios visibles para todo el equipo de la tarea, con soft-delete.

**Alcance:**
- Modelo `TaskComment` con `taskId`, `authorId`, `body`, `createdAt`, `deletedAt?`, `deletedByAuthor: boolean`.
- Quién puede comentar: autor, responsable, asignados.
- Eliminación:
  - Solo el autor del comentario puede eliminarlo.
  - Solo si han pasado menos de 60 minutos desde `createdAt`.
  - Soft-delete: no se borra el registro; en UI se renderiza `"Comentario eliminado por el autor."`.
- Visibilidad de comentarios: todos los participantes de la tarea.

**Depende de:** Propuestas 1 y 2.

---

## Propuesta 4 — `add-tasks-documents`

**Objetivo:** Adjuntar/descargar/eliminar documentos en una tarea.

**Alcance:**
- Modelo `TaskDocument` con `taskId`, `uploaderId`, `fileName`, `mimeType`, `size`, `storageKey`, `createdAt`.
- Tipos permitidos: pdf, doc/docx, xls/xlsx, ppt/pptx, zip (lista cerrada — definir en spec).
- Storage: reusar la integración R2 ya existente en el proyecto.
- Permisos:
  - Subir: autor, responsable, asignados.
  - Descargar: autor, responsable, asignados.
  - Eliminar:
    - Autor de la tarea → cualquier documento.
    - Cualquier otro participante → solo los documentos que él mismo subió.

**Depende de:** Propuestas 1 y 2.

---

## Propuesta 5 — `add-tasks-checklist`

**Objetivo:** Checklist simple por tarea.

**Alcance:**
- Modelo `TaskChecklistItem` con `taskId`, `label`, `checked: boolean`, `order`, timestamps.
- Pueden crear/editar/marcar/eliminar items:
  - El autor de la tarea.
  - Cualquier usuario asignado.
- (Definir en spec: si el responsable también puede — el requerimiento original dice "autor o asignados"; confirmar si responsable cuenta como asignado.)

**Depende de:** Propuestas 1 y 2.

---

## Propuesta 6 — `add-tasks-deadline-and-responsible-actions`

**Objetivo:** Enforcement del plazo (`dueAt`) y acciones del responsable sobre el estado.

**Alcance:**
- Al pasar `dueAt`:
  - Responsable y equipo de apoyo pierden la capacidad de modificar la tarea, adjuntar/eliminar documentos, modificar checklist.
  - Solo queda habilitado: agregar comentarios.
  - El autor mantiene sus capacidades (definir en spec si también queda restringido — el requerimiento original es ambiguo en este punto y debe aclararse).
- Acciones del responsable:
  - Cambiar `status` de la tarea, SIEMPRE QUE:
    - No haya vencido el plazo.
    - El cambio venga acompañado de un comentario obligatorio (atómico: cambio + comentario en la misma operación).
  - Además todas las acciones permitidas al equipo de apoyo (ver, descargar documentos, comentar, adjuntar, eliminar sus propios documentos y comentarios bajo las reglas ya definidas).

**Depende de:** Propuestas 1–4 (necesita estado, asignaciones, comentarios y documentos para enforzar las reglas).

---

## Resumen del orden recomendado

1. `add-tasks-core` — entidad + autor
2. `add-tasks-assignments-and-visibility` — roles + filtrado
3. `add-tasks-comments` — comentarios (lo necesita la propuesta 6)
4. `add-tasks-documents` — adjuntos
5. `add-tasks-checklist` — checklist
6. `add-tasks-deadline-and-responsible-actions` — enforcement temporal + responsable

Las propuestas 3, 4 y 5 son independientes entre sí y pueden trabajarse en paralelo una vez cerrada la 2. La 6 cierra el ciclo y debe ir al final.

---

## Puntos a aclarar antes de empezar

Antes de abrir la primera `openspec propose`, conviene resolver estas ambigüedades del requerimiento original:

1. **Tras vencer `dueAt`, ¿el autor también queda restringido?** El texto dice "tanto para el responsable como para el equipo de apoyo se pierde la posibilidad de modificar"; no menciona al autor. Hay que decidir explícitamente.
2. **¿El responsable cuenta como "usuario asignado"** para efectos del checklist y de visibilidad? Sugerencia: tratarlo como miembro implícito del equipo de apoyo + rol adicional.
3. **Lista cerrada de tipos de archivo permitidos** y tamaño máximo por archivo / por tarea.
4. **Notificaciones**: el requerimiento no las menciona. ¿Se difieren a una propuesta futura (`add-tasks-notifications`)? Recomendado: sí, no incluir en este lote.
5. **Auditoría / historial de cambios de estado y visibilidad**: ¿se requiere log? Si sí, candidata a propuesta separada (`add-tasks-audit-log`).
