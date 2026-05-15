## Context

Las capabilities previas del dominio de tareas (`tasks-core`, `task-assignments`, `task-comments`, `task-documents`) ya consolidaron un patrón claro: tablas relacionadas con `task` vía FK CASCADE, server actions en `lib/tasks/`, autorización proyectada como `TaskCapabilities`, y UI en `TaskDetailPane` (tabs Detalle/Comentarios/Documentos). El checklist es la última pieza de colaboración por tarea y debe encajar en ese patrón sin introducir conceptos nuevos.

La única decisión de diseño con peso es la **matriz de autorización por visibility**, que diverge sutilmente de comments/documents: comments y documents permiten al member-autor participar incluso en `draft` (porque hereda la regla de visibilidad), pero el checklist en `draft` queda reservado al autor + admin/owner. Esto refleja la naturaleza del checklist como herramienta de planificación, no de ejecución colaborativa.

## Goals / Non-Goals

**Goals:**

- Permitir a los participantes de una tarea activa colaborar marcando avance en pasos concretos.
- Reutilizar el patrón ya establecido por `task-comments` y `task-documents` para minimizar carga cognitiva.
- Persistir auditoría de toggle (`checkedById`, `checkedAt`) desde día 1 sin imponer migraciones futuras.
- Mantener el bloque UI inline en el tab "Detalle" para no inflar la cantidad de tabs.

**Non-Goals:**

- Reordenamiento explícito de items (drag-and-drop). Orden cronológico es suficiente en v1.
- Timeline / actividad mostrando "Ana marcó el item X hace 2h". Los datos se persisten pero no se renderizan.
- Plantillas de checklist reutilizables entre tareas.
- Sub-items / checklist anidado.
- Asignación de items a usuarios específicos (ej. "este item es de Juan"). Si surge, es propuesta futura.
- Paginación. Volumen esperado es bajo (≤30 items por tarea típica).
- Notificaciones cuando alguien marca un item.

## Decisions

### Decisión 1: Matriz de autorización por `visibility`, no por participación

**Qué:** El gate para mutar items depende de la `visibility` de la tarea (`draft` / `active` / `archived`) y, en `draft`, también del rol/autoría.

**Por qué:** Tres motivos:
1. En `active`, el checklist es herramienta colaborativa: todos los que ven la tarea deben poder marcar avance. Esto coincide con la regla de visibilidad de `task-assignments` y con `canComment`.
2. En `draft`, la tarea aún se está definiendo. El responsable y los assignees no necesariamente saben todavía que van a participar. Restringirlo a autor + admin/owner evita que un assignee designado provisionalmente edite el plan antes de que la tarea sea activada.
3. En `archived`, la tarea está congelada. Nada debe mutar.

**Alternativa considerada:** Usar exactamente el mismo gate que `canComment` (admin/owner siempre; member solo en `active` si participa). Rechazada porque mete a responsable/assignees en `draft` sin justificación de producto.

**Implicación:** El helper de autorización es nuevo (`assertCanManageChecklist`), no se reusa `assertCanParticipate` de comments/documents. Vale la pena documentar la divergencia.

### Decisión 2: Una sola operación con un solo gate

**Qué:** Crear item, editar label, togglear `checked` y eliminar item pasan por el mismo `assertCanManageChecklist`. No hay un gate más laxo para togglear y otro más estricto para definir.

**Por qué:** Simplicidad. Mezclar gates lleva a UI inconsistente ("puedo marcar pero no editar el label que yo mismo escribí"). Si en el futuro emerge la necesidad de separar (ej. assignees pueden marcar pero solo el autor define items), se hace en una propuesta posterior con datos de uso reales.

**Alternativa considerada:** Separar `canToggleChecklistItem` (amplio) de `canManageChecklistItems` (estricto). Rechazada por agregar conceptos sin demanda concreta.

### Decisión 3: Persistir `checkedById` / `checkedAt` desde día 1, sin exponer en UI

**Qué:** La tabla incluye dos columnas para auditoría de toggle. La UI v1 no las muestra.

**Por qué:** Agregar columnas a una tabla con datos productivos exige migración + backfill (o nullable forever, que es lo que queremos evitar). El costo de incluirlas ahora es nulo (2 columnas nullable). El día que se quiera mostrar "marcado por X hace Y" o construir un timeline de actividad, los datos ya estarán ahí desde el primer item creado.

**Alternativa considerada:** Esperar a que haya un caso de uso concreto. Rechazada porque la migración futura es ruidosa y los datos retroactivos serían `NULL` para todos los items previos.

**Detalle de coherencia:** Al destogglear (`checked: false`), ambos campos vuelven a `NULL` (no se conserva "última vez que estuvo marcado"). Esto evita ambigüedad: el par `(checkedById, checkedAt)` siempre describe el toggle vigente o nada.

### Decisión 4: Orden por `createdAt ASC`, sin campo `order`

**Qué:** Los items se devuelven en orden de creación ascendente. No hay reorder ni columna `order`.

**Por qué:** El reorder agrega complejidad (estrategia de enteros densos vs. espaciados, transacciones para mover items, UI de drag-and-drop) sin demanda explícita en la propuesta original. Si emerge, se agrega como propuesta posterior con una columna `position` y una server action de reorder.

**Implicación:** Si el usuario quiere reordenar, debe borrar y recrear. Aceptable en v1 dado el volumen esperado (pocos items por tarea).

### Decisión 5: UI inline en el tab "Detalle", no tab nuevo

**Qué:** `TaskChecklistPanel` se renderiza dentro del `TabsContent value="details"` del `TaskDetailPane`, debajo del bloque de descripción. NO se agrega un cuarto trigger al `TabsList`.

**Por qué:** El checklist es estructura interna del cuerpo de la tarea, no un anexo (a diferencia de comments y documents que son canales de colaboración independientes). Visualmente fluye con la descripción: "qué hay que hacer" (descripción) → "pasos concretos" (checklist). Agregar un cuarto tab también empieza a saturar el `TabsList`.

**Alternativa considerada:** Tab "Checklist (N/M)" con contador de progreso. Rechazada por la razón anterior. Si la UX revela que el checklist necesita más prominencia, se puede mover a tab en una propuesta futura sin cambiar la spec (solo el componente de presentación).

### Decisión 6: Render condicional del bloque vacío

**Qué:** Si la tarea NO tiene items Y el viewer NO tiene `canManageChecklist`, el bloque "Checklist" no se renderiza en absoluto. Si tiene items pero no puede gestionar, se renderiza solo-lectura. Si puede gestionar (con o sin items), se renderiza con input "+ agregar item".

**Por qué:** Evita ruido visual ("Checklist (vacío)") cuando el viewer no puede hacer nada al respecto. El bloque solo aparece cuando hay contenido para mostrar o acción para realizar.

### Decisión 7: Sin cambios en `deleteTask`

**Qué:** A diferencia de `task-documents` (que tuvo que limpiar blobs en R2 antes del DELETE), `task-checklist` no requiere preprocesamiento. La FK `ON DELETE CASCADE` sobre `taskId` elimina los items automáticamente.

**Por qué:** No hay recursos externos a limpiar. La cascada DB es suficiente.

## Risks / Trade-offs

- **[Divergencia de autorización con comments/documents]** → Mitigación: documentar explícitamente en el spec y en el código (`assertCanManageChecklist`) que el gate de `draft` es más estricto, con un comentario JSDoc que explique por qué. Tests que cubran el caso del responsable/assignee bloqueado en draft.

- **[Items en `archived` quedan inmutables sin posibilidad de "rescatar"]** → Mitigación: ya hay una transición `archived → active` en `tasks-core`. Si un equipo necesita modificar el checklist, reactivan la tarea. Documentar en el spec.

- **[Sin reorder, items mal ordenados obligan a borrar/recrear]** → Mitigación: aceptado en v1; el volumen esperado es bajo y los usuarios pueden planificar el orden al crear. Si emerge fricción real, propuesta futura agrega `position`.

- **[`checkedById` apunta a un usuario eliminado → `NULL`]** → Mitigación: `ON DELETE SET NULL` en la FK. La UI v1 no muestra el dato, así que no impacta render. Cuando se exponga, fallback a "Usuario eliminado" como en `task-documents`.

- **[Volumen alto de items en una tarea (>100) puede pesar la consulta]** → Mitigación: improbable en v1 según el caso de uso. Si se vuelve real, propuesta futura agrega paginación o lazy-load del bloque.

- **[Race condition: dos usuarios togglean el mismo item simultáneamente]** → Mitigación: la última escritura gana; `checkedById` y `checkedAt` reflejan al último que tildó. Aceptable: el estado convergente es coherente y `updatedAt` refleja el último toque.
