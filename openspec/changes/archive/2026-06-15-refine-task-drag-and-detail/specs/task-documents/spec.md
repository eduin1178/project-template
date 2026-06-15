## MODIFIED Requirements

### Requirement: Tab "Documentos" en `TaskDetailPane`
El sistema SHALL renderizar documentos adjuntos dentro de un tab `Documentos` ubicado debajo del bloque de descripción en la columna principal del detalle full-page, junto al tab `Checklist`. El label del tab SHALL incluir el conteo de documentos cuando existan. El tab SHALL mostrar el panel `TaskDocumentsPanel` con la lista y acciones permitidas, visible solo cuando su tab esté activo.

El tab SHALL recibir la lista de documentos con sus campos proyectados, el flag `canUploadDocument` y los identificadores necesarios para invocar las server actions. Tanto en desktop como en mobile, documentos y checklist SHALL compartir el mismo control de tabs; el orden de los tabs SHALL ser estable (`Checklist` primero, `Documentos` después).

#### Scenario: Documentos accesibles desde su tab
- **WHEN** un viewer autorizado abre el detalle y selecciona el tab `Documentos`
- **THEN** el tab muestra el panel de documentos con la lista y acciones permitidas

#### Scenario: Contador refleja el total de documentos en el label del tab
- **WHEN** una tarea tiene tres documentos asociados
- **THEN** el label del tab `Documentos` comunica que hay 3 documentos

#### Scenario: Estado vacío cuando no hay documentos
- **WHEN** una tarea no tiene documentos y el viewer abre el tab `Documentos`
- **THEN** el panel muestra un estado vacío claro según las reglas de `TaskDocumentsPanel`
