## Context

El sistema actual de tareas (`tasks-core`, `task-assignments`, `task-comments`, `task-documents`, `task-checklist`) tiene un campo `dueAt` puramente informativo: no dispara ningún cambio de comportamiento al vencer. Las server actions de mutación validan rol y participación, pero NO comparan `dueAt` contra `now()`. El resultado es que una tarea con plazo vencido se puede seguir modificando indefinidamente, sin trazabilidad y sin escalado natural a admin.

La proyección de capabilities ya existe (`canEditContent`, `canEditDueAt`, `canComment`, `canManageChecklist`, `canUploadDocument`, etc.) y se calcula server-side al cargar el detalle. Esta propuesta agrega una dimensión al cómputo: el estado de vencimiento.

Stakeholders: admins/owners (mantienen control total), responsables y assignees member regular (pierden capacidades al vencer), autores (mantienen capacidades sobre su tarea). El producto ya viene en español neutral con `tú` y esa convención se preserva en toda la copy nueva.

## Goals / Non-Goals

**Goals:**
- Convertir `dueAt <= now()` en un gate funcional sobre operaciones de mutación.
- Forzar trazabilidad de cambios de `status` mediante un comentario obligatorio atómico de mínimo 30 caracteres.
- Mantener el contrato de capabilities como única fuente de verdad para el UI (el UI no inspecciona `dueAt`).
- Reducir fricción en la creación de tareas con un default de `dueAt` razonable.

**Non-Goals:**
- No se cambia la regla de visibilidad por rol (`task-assignments`).
- No se persiste un estado nuevo "vencida" — la condición es derivada en runtime.
- No se introduce un job de notificación, recordatorio ni archivado automático al vencer.
- No se cambian las reglas de edición de `title`, `description`, `dueAt`, ni de transición de `visibility` (esas siguen siendo admin/owner-only sin vinculación al vencimiento).
- No se modifica `CreateComment` (comentar permanece abierto al vencer; solo cambia la **eliminación** de comentario propio).
- No se hace backfill de comentarios "sintéticos" sobre `status` historicos.

## Decisions

### D1. La condición "vencida" es derivada, no persistida

**Decisión**: Cada server action que aplica la regla de vencimiento ejecuta `task.dueAt !== null && task.dueAt <= now()` al momento de la operación. No hay columna `isExpired`, ni job que mute estado.

**Alternativas consideradas**:
- *Columna `isExpired` actualizada por trigger*: rechazada por complejidad (triggers de tiempo no existen; requeriría un cron) y porque introduce drift entre realidad y bandera.
- *Vista materializada*: rechazada por overhead y porque la query es trivial.

**Rationale**: La verdad sobre vencimiento ya está en `dueAt`. Cualquier proyección es redundante. Como toda action consulta la tarea antes de operar, evaluar el predicado in-place es O(0).

### D2. La hora de referencia es `NOW()` del servidor

**Decisión**: La comparación usa `NOW()` de Postgres dentro de la query, o `new Date()` de Node si la evaluación ocurre en el handler tras leer la tarea. Indistintamente. Se ignora la zona horaria del cliente porque `dueAt` ya es `timestamptz` y las comparaciones de instantes son monotónicas.

**Rationale**: Evita escenarios donde un cliente con clock skew o TZ engañosa pase un check que en server fallaría. Predecible y auditable.

### D3. `changeTaskStatus` se convierte en server action atómica con comentario obligatorio

**Decisión**: Reemplazar la action existente de transición de `status` por `changeTaskStatus(taskId, newStatus, commentBody)`. La action abre una transacción Drizzle (`db.transaction`) y dentro:

1. Valida que el invocador puede cambiar status sobre esta tarea (rol + autoría + responsabilidad + assignee, todo cruzado con el gate de vencimiento).
2. Valida que `newStatus` es una transición permitida desde `task.status` (regla existente: no `pending → done` directo).
3. Valida que `commentBody.trim().length` esté entre 30 y 2000.
4. Inserta una fila en `task_comment` con `authorId = invocador`, `body = commentBody.trim()`.
5. Actualiza `task.status = newStatus` y refresca `updatedAt`.
6. Commit.

Si cualquier paso falla, rollback completo: no queda el comentario sin el cambio ni viceversa.

**Alternativas consideradas**:
- *Dos actions secuenciales*: rechazada — abre ventana de inconsistencia (status cambia, comentario falla por hash de red, queda cambio sin justificación).
- *Comentario opcional con marca "system"*: rechazada — pierde el valor de trazabilidad y agrega complejidad al modelo (`task_comment.kind` no existe).
- *Tabla nueva `task_status_change_event`*: rechazada — duplica el modelo de comentarios para un caso que ya cabe en él. Si más adelante se quiere distinguir eventos, se agrega columna `kind` al comentario y se migra.

**Rationale**: Los comentarios de cambio de status quedan visibles en el feed normal del detalle, dándole contexto en línea al lector sin requerir una pantalla aparte.

### D4. Bypass por rol y por autoría sobre el gate de vencimiento

**Decisión**: El predicado de "puede operar al vencer" se factoriza en una función pura `canActOnExpired(viewer, task)` que retorna `true` si:

- `viewer.role ∈ {admin, owner}` en la organización de la tarea, O
- `viewer.id === task.authorId`.

Cada capability afectada (`canChangeStatus`, `canManageChecklist`, `canUploadDocument`, `canDeleteOwnDocument`, `canDeleteOwnComment`) compone esta función con su regla base.

**Rationale**: Centraliza la regla en un solo lugar. Si el día de mañana se ajusta (por ejemplo, "el responsable también bypassea"), se cambia una función y todas las capabilities se ajustan en bloque.

### D5. `canChangeStatus` se agrega al contrato `TaskCapabilities`

**Decisión**: Sumar el flag `canChangeStatus: boolean` al objeto que se serializa al cliente por cada tarea visible. Se computa como:

```
canChangeStatus =
  task.visibility === 'active' &&
  (
    viewer.role ∈ {admin, owner}  ||
    viewer.id === task.authorId   ||
    (
      (viewer.id === task.responsibleId || viewer.id ∈ task.assignees)
      && !isExpired(task)
    )
  )
```

El UI lee este flag para mostrar/ocultar el botón "Cambiar estado". El UI NO conoce `dueAt` para esta decisión.

**Rationale**: Mismo patrón ya establecido para `canComment` y `canUploadDocument`. Una sola fuente de verdad, fácil de testear, fácil de extender.

### D6. Default `dueAt` en `CreateTaskDialog` se computa en el servidor al renderizar

**Decisión**: La page que renderiza el dialog en `/admin/tasks` pasa `defaultDueAt` como prop al componente, calculado server-side como `new Date()` con día +7 y `setHours(18, 0, 0, 0)`. El componente cliente arranca el campo con ese valor como ISO string.

El servidor decide el default; el cliente solo lo muestra y permite editar. Si el usuario limpia el campo y envía, el backend acepta `dueAt = null` (regla actual sobre draft sigue intacta).

**Alternativas consideradas**:
- *Computar en el cliente*: rechazado, queda atado a la TZ del navegador y a su reloj local; produciría drift visible para usuarios en zonas distintas.
- *Aplicar default en el server al crear si llega `null`*: rechazado — la regla del modelo permite drafts sin `dueAt` legítimamente; no es decisión del backend imponer un valor cuando el usuario lo limpia intencionalmente.

**Rationale**: El default es UX, no contrato. Server-rendered mantiene consistencia.

### D7. Las capabilities afectadas leen `isExpired` desde la proyección

**Decisión**: La función que proyecta `TaskCapabilities` calcula `isExpired = task.dueAt !== null && task.dueAt <= now()` una vez por tarea y la usa para todos los flags. No se reevalúa por cada capability.

**Rationale**: Coherencia: si la página tarda en cargar y `now()` cambia entre flags, todos los flags quedan calculados sobre el mismo instante. Predecible para testing.

### D8. La eliminación de comentario propio queda bloqueada al vencer

**Decisión**: La server action de borrar el propio comentario (ventana de 60 minutos según spec `task-comments`) suma el gate de vencimiento de la tarea contenedora. Un member regular que es autor de un comentario en una tarea ahora vencida pierde el botón "eliminar" sobre su comentario, incluso si estaba dentro de la ventana de 60 minutos.

El admin/owner y el autor de la tarea pueden seguir eliminando comentarios (admin sin restricción temporal, autor de la tarea solo los suyos y dentro de su ventana).

**Rationale**: Coherencia con el resto del enforcement: el principio es que el member regular no puede mutar nada salvo comentar. Editar/borrar su propio comentario es una forma de mutar.

### D9. Crear comentario NO se bloquea al vencer

**Decisión**: La acción `createComment` permanece sin cambios. Cualquier viewer con visibilidad puede comentar siempre.

**Rationale**: Comentar es el canal de coordinación; cortarlo al vencer dejaría a los participantes sin forma de notificar al admin que el plazo se pasó o pedir extensión. Es la única acción que sobrevive el vencimiento intencionalmente.

## Risks / Trade-offs

- **[Drift de clock servidor]** → si el reloj del servidor está desincronizado, tareas pueden marcarse como vencidas antes/después del momento real. *Mitigación*: NTP en el servidor (ya estándar). Tareas operacionalmente cercanas al vencimiento son raras.

- **[Operación legítima rechazada por borde]** → un member intenta cambiar status `dueAt - 1s` antes de vencer, la action evalúa `dueAt - 1s` antes pero por latencia se commitea `dueAt + 100ms` después. *Mitigación*: la evaluación es atómica en la transacción contra `NOW()`; si llega tarde, la rechaza con un mensaje útil ("El plazo venció; pide a un admin que extienda el plazo o cambie el estado"). El UX está cubierto por el copy.

- **[Comentarios obligatorios cortos no informativos]** → el usuario escribe 30 chars vacíos de contenido ("aaaaaaa..."). *Mitigación*: 30 es el piso, no la garantía. La culturización de comentarios útiles no es un problema de validación. No vale la pena agregar análisis de calidad.

- **[Default 18:00 desalineado para clientes en otra TZ]** → un usuario en TZ -5 que crea tarea con default `now + 7d 18:00 (TZ servidor en UTC)` ve "las 13:00 de su día" como vencimiento. *Mitigación*: aceptable en v1; el usuario edita si lo necesita. Si se vuelve doloroso, se pasa a TZ del cliente vía cookie o user setting. No vale la pena ahora.

- **[Comentarios de status mezclados con comentarios manuales]** → en el feed, no se distinguen visualmente. *Mitigación*: aceptable en v1; quien lee ve el cambio de status en la timeline cercana al comentario. Si se necesita distinguir, se introduce `task_comment.kind` en propuesta futura.

- **[Tareas legacy vencidas tras deploy]** → el día del deploy todas las tareas con `dueAt < now()` quedan congeladas para members regulares. *Mitigación*: comportamiento esperado; es el objetivo. Un admin las puede destrabar caso por caso extendiendo `dueAt`, archivando o cambiando status (admin no está bloqueado).

## Migration Plan

1. Deploy de código (no hay migración DB).
2. El nuevo gate empieza a aplicarse en el instante de deploy. Tareas legacy con `dueAt` pasado quedan congeladas para members regulares; admins pueden destrabarlas.
3. La nueva action `changeTaskStatus` reemplaza la transición previa. El cliente actualizado abre el diálogo con textarea; clientes con caché obsoleta (server actions invocadas por URL antigua) fallarán con error de validación faltando `commentBody` — comportamiento aceptable en una app server-rendered.

**Rollback**: revertir el deploy. No hay esquema migrado.

## Open Questions

Ninguna bloqueante. Decisiones de producto pendientes para futuras propuestas (no parte de este change):

- ¿Mostrar visualmente "vencida" en la lista (badge, color)? — UX a definir en propuesta de inbox/list.
- ¿Recordatorios automáticos antes de vencer? — propuesta separada de notificaciones.
- ¿Default de `dueAt` configurable por organización? — propuesta separada de org settings.
