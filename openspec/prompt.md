/opsx:explore 



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

Esto es continuacion del cambio archivado 2026-05-14-add-task-comments y 2026-05-14-add-tasks-inbox-and-admin-edit