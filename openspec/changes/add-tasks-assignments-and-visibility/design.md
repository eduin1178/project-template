## Context

`tasks-core` (archivado, ya implementado en `next-app/lib/tasks/*`) modela la tarea como un objeto único por organización, accesible solo a `admin`/`owner` vía `requireOrgAdmin`. Hoy el listado retorna todas las tareas de la org sin filtrar por persona, y la autoría se reasigna con "tomar posesión".

Este cambio agrega dos relaciones de personas (`responsibleId` 1-a-1 opcional y `assignees` N-a-N) y, sobre todo, abre la lectura a `member` regulares cuando son parte del trío `{author, responsible, assignees}` y la tarea está en `active`. Eso significa que las queries y las rutas dejan de poder asumir "admin solamente".

Las invariantes del dominio (pertenencia a la org, disyunción responsable/assignees) se aplicarán en server actions y queries — no en la base — porque Postgres no puede verificar de forma natural que un `userId` referenciado en `task_assignee` pertenezca a `member` de la organización de `task` sin un trigger o función custom, y un CHECK constraint no puede consultar otras tablas. La regla "no podés ser responsable y assignee a la vez" sí podría modelarse con un constraint, pero el chequeo en action es suficiente y más legible.

## Goals / Non-Goals

**Goals:**
- Modelar responsable (opcional) y assignees (N) con integridad referencial a `user` y comportamiento de borrado consistente con el resto del schema.
- Permitir que `member` vea SOLO las tareas `active` donde participa, sin abrir el resto del panel admin.
- Reutilizar la UI de `/admin/tasks` para la vista de member en `/tasks` mediante componentes presentacionales que reciben `capabilities` por tarea.
- Endurecer las reglas de edición y agregar borrado en draft sin romper el código admin existente más allá de lo necesario.
- Mantener `tasks-core` como capability única — `task-assignments` se materializa como **delta MODIFIED** sobre `tasks-core` Y un capability nuevo `task-assignments`, según donde mejor encaje cada requirement.

**Non-Goals:**
- Permitir que members creen tareas. Sigue siendo admin-only.
- Que responsable/assignees cambien `status` o `visibility`. Sigue siendo admin-only.
- Notificaciones, comentarios, documentos adjuntos, checklist.
- Migración retroactiva de tareas `active` existentes para forzar `responsibleId` no nulo.
- Soft delete o papelera de tareas; el delete en draft es físico.

## Decisions

### D1. `responsibleId` como columna en `task`, no como join table

**Decisión:** `task.responsibleId text` nullable con FK a `user.id` y `onDelete SET NULL`.

**Por qué:** Es 1-a-1 (cada tarea tiene a lo sumo un responsable). Una join table sería sobreingeniería. `SET NULL` permite que la tarea sobreviva si el usuario se va de la organización — el admin reasigna o la tarea queda visible como "sin responsable" para que se actúe sobre ella.

**Alternativa considerada:** `onDelete CASCADE` — descartada porque borraría la tarea entera al borrar al usuario, lo que es un efecto lateral peligroso para algo administrativo.

### D2. `task_assignee` como tabla pivot con PK compuesta

**Decisión:** tabla `task_assignee (taskId text, userId text)` con PK `(taskId, userId)`, FKs con `onDelete CASCADE` en ambos lados, índice secundario por `userId`.

**Por qué:** N-a-N estándar. PK compuesta hace imposible la duplicación. `CASCADE` en `taskId` limpia automáticamente cuando se borra la tarea (sin orphan rows). `CASCADE` en `userId` limpia cuando se borra al usuario (caso raro pero consistente con el resto del schema). El índice por `userId` es load-bearing para la query del listado de member: `WHERE userId = me`.

**Alternativa considerada:** columna `taskId text[]` en `user` o `assigneeIds text[]` en `task` — descartada por pérdida de integridad referencial y dificultad para indexar el listado de member.

### D3. Invariantes en server action, no en DB

**Decisión:** "miembro de la org" y "disyunción responsable/assignees" se validan en `actions.ts` antes del write. La DB solo tiene FKs y PK compuesta.

**Por qué:**
- "miembro de la org" requiere join con `member` filtrando por `organizationId` — un CHECK constraint no puede; haría falta un trigger o función, y eso introduce complejidad operativa (migraciones, fallos opacos al desarrollador).
- "disyunción" sería expresable con un trigger pero la regla es legible en TypeScript y se acompaña de un mensaje de error en español neutral; un trigger sería un acoplamiento más con menos legibilidad.

**Trade-off explícito:** un cliente Drizzle que escriba directo sin pasar por la action puede violar invariantes. Mitigación: todas las escrituras de `task` y `task_assignee` deben pasar por `lib/tasks/actions.ts`. Documentar en el spec.

### D4. Activación exige `responsibleId` además de `dueAt`

**Decisión:** la action `transitionVisibility` con `to = 'active'` exige que la tarea tenga (o reciba en el payload) tanto `dueAt` como `responsibleId`. Si falta cualquiera, falla con error de validación. La regla se valida en la action; la DB no la fuerza para no bloquear las tareas active legacy creadas por `tasks-core`.

**Por qué:** las tareas `active` son el punto de delegación. Sin responsable, no hay a quién apuntar. Espejar la lógica ya existente de "dueAt requerido al activar".

**Migración:** las tareas que ya están `active` sin `responsibleId` quedan tal cual. Al primer admin que intente moverlas de visibility de vuelta a `active`, deberá asignar responsable. No se hace backfill automático porque no hay forma de adivinar a quién asignar.

### D5. Edición de contenido: dos puertas, no una

**Decisión:** la action `updateTaskContent` acepta dos perfiles de invocador:
1. autor + tarea en draft → puede editar `title`, `description`.
2. admin/owner de la org → puede editar `title`, `description` en cualquier visibility, y `dueAt` si la tarea no está `archived`.

**Por qué:** la regla "solo autor en draft" del enunciado quiere proteger al autor (member o admin) de ediciones externas mientras es borrador. Pero un admin que necesite corregir un título de una tarea ya `active` o `archived` no puede quedar bloqueado — sigue siendo superusuario de su org.

**Implementación:** un único `requireOrgMember()` que retorne `{ userId, orgId, role }`; la action ramifica según `role` y según ser o no el autor.

**Alternativa considerada (rechazada):** dos acciones separadas (`updateAsAuthor`, `updateAsAdmin`). Más explícita pero duplica validación y partido. La rama dentro de una sola action es manejable porque las dos puertas comparten 90% de lógica.

### D6. `dueAt` editable solo en `draft` y `active`

**Decisión:** `dueAt` no se puede modificar cuando `visibility = 'archived'`. Mover de `archived` a `active` permite reagendar en el mismo payload (igual que la regla de activación).

**Por qué:** una tarea archivada es histórica. Cambiarle el plazo borra evidencia. Si hace falta reabrir, hay un camino explícito (transición a `active`) que ya pide `dueAt`.

### D7. Borrado físico, solo en draft

**Decisión:** `deleteTask` borra la fila de `task` (cascade limpia `task_assignee`). Solo permitido si `visibility = 'draft'`. Puede invocarlo el autor o cualquier admin/owner.

**Por qué:** una vez que la tarea fue `active`, ya estuvo expuesta a responsable/assignees y puede haber generado expectativa de trabajo. Borrarla deja inconsistencias percibidas. `archived` ya cumple el rol de "removida" para tareas que pasaron por `active`. Drafts son ensayos del autor — borrarlos no afecta a nadie más.

**Alternativa considerada:** soft delete con `deletedAt`. Rechazada por overhead innecesario para algo que solo aplica a drafts (cardinalidad baja, sin auditoría pretendida en esta propuesta).

### D8. Reglas de visibilidad: admin bypass total, member estrictamente filtrado

**Decisión:** las queries de lectura se ramifican por rol del viewer:

```
listTasksForAdmin(orgId, filters)
  WHERE organizationId = orgId
        [+ filtros opcionales por visibility/status]

listTasksForMember(orgId, userId)
  WHERE organizationId = orgId
    AND visibility = 'active'
    AND (
         authorId = userId
      OR responsibleId = userId
      OR EXISTS (SELECT 1 FROM task_assignee
                 WHERE task_assignee.taskId = task.id
                   AND task_assignee.userId = userId)
    )
```

**Por qué:** dos queries explícitas evitan que la query admin pague el costo del filtro de participación, y mantienen la query de member predecible y testable. El plan de Postgres puede usar el índice sobre `task_organization_id_idx` + el índice nuevo `task_assignee_user_id_idx` para el `EXISTS`. Para volúmenes razonables (cientos de tareas por org), no se anticipa problema de rendimiento.

**Alternativa considerada:** una query unificada con parámetro `isAdmin` boolean y `WHERE` dinámico. Rechazada porque mezcla dos planes de ejecución muy distintos en un solo path.

### D9. Una ruta por rol, componentes compartidos

**Decisión:**
- `/admin/tasks` mantiene su semántica actual (admin-only via `requireOrgAdmin`).
- `/tasks` nueva, accesible a cualquier viewer con `activeOrganizationId` (admin, owner o member) via `requireOrgMember`.
- Las dos rutas usan los mismos componentes presentacionales en `components/tasks/`. Cada ruta:
  1. Ejecuta su query de lectura (`listTasksForAdmin` o `listTasksForMember`).
  2. Por cada tarea, calcula un objeto `capabilities` según `(viewerRole, viewerUserId, task)`.
  3. Pasa `items` + `capabilities` al componente compartido.

**Por qué:** mantiene la convención `/admin/* = admin-only`, evita un guard "doble" en una sola ruta, y centraliza la lógica de poderes en una sola función `computeCapabilities` testeable.

**`capabilities` por tarea:**
```ts
type TaskCapabilities = {
  canViewDetail: boolean;       // siempre true si está en el listado
  canEditContent: boolean;      // autor+draft || admin
  canEditDueAt: boolean;        // admin && visibility != 'archived'
  canDelete: boolean;           // (autor || admin) && visibility = 'draft'
  canClaim: boolean;            // admin && authorId != viewerUserId
  canTransitionVisibility: boolean; // admin
  canTransitionStatus: boolean;     // admin
  canManageTeam: boolean;       // autor || admin
};
```

Los componentes consumen estos flags y nunca conocen el rol directamente.

### D10. Contrato del listado se extiende, no se rompe

**Decisión:** `TaskListItem` agrega `responsibleId`, `responsibleName`, `responsibleEmail`, `assignees: { userId, name, email }[]`. El admin existente ignora los campos nuevos si no los renderiza.

**Por qué:** sumar columnas opcionales no rompe consumidores tipados existentes (TypeScript estructural). La alternativa de tener dos tipos divergentes (admin vs member) duplica la deserialización y complica los componentes compartidos.

**Performance:** el listado necesita resolver responsable + assignees por tarea. Usaremos:
1. Un `LEFT JOIN` a `user` por `responsibleId` (igual que ya se hace con `authorId`).
2. Un fetch separado de assignees con `IN (taskIds)` y agrupación en TS, para evitar `GROUP_CONCAT` / agregaciones cruzadas que ensucian la query.

### D11. `task_assignee` no requiere `addedAt` ni `addedBy`

**Decisión:** la tabla pivot solo tiene `(taskId, userId)`. Sin auditoría temporal ni de quién agregó.

**Por qué:** no es scope de esta propuesta. Si en el futuro hace falta auditoría, se agregan columnas sin migración disruptiva.

## Risks / Trade-offs

- [Riesgo: tareas `active` legacy sin `responsibleId`] → Mitigación: el listado admin las muestra normalmente; la regla de "responsibleId requerido al activar" solo aplica en la action de transición, así que las legacy quedan estables. Si un admin las archiva y reactiva, se le pedirá responsable en ese momento.
- [Riesgo: un member que es `responsible` queda huérfano si lo expulsan de la org] → Mitigación: `responsibleId` queda apuntando a un `user.id` que ya no es member de la org. La query de listado de member no le mostrará la tarea (la query nueva chequea participación, no membership). La query admin la sigue viendo y el admin puede reasignar. Caso degradado aceptable. (Nota: borrar el `member` row de Better Auth no borra el `user`, solo la membresía).
- [Riesgo: un assignee deja la org sin que un admin limpie su row en `task_assignee`] → Mitigación: igual al anterior. La fila queda; la query de member ya no le mostrará la tarea (no es member); la query admin sigue mostrando la tarea con el usuario en assignees. Si después vuelve a ingresar a la org, recupera visibilidad — es comportamiento aceptable. Si molesta, una propuesta futura agrega cleanup al expulsar member.
- [Riesgo: la query de member usando `EXISTS` con tabla pivot tiene plan subóptimo con muchas tareas/asignaciones] → Mitigación: índice por `task_assignee.userId`. Para el volumen esperado (organizaciones de decenas a cientos de members y tareas), Postgres elige `Index Scan` cómodamente.
- [Trade-off: invariantes en action permiten bypass por escritura directa a DB] → Aceptado. Documentar en spec que toda escritura debe pasar por `lib/tasks/actions.ts`. No se planean otros puntos de entrada.
- [Riesgo: extender `TaskListItem` con `assignees: [...]` y `responsible*` infla el payload del listado admin si las orgs tienen muchas asignaciones por tarea] → Mitigación: en la práctica esperamos pocos assignees por tarea (1-10). Si excede, una propuesta futura puede paginar o resumir.
- [Trade-off: dos rutas (`/admin/tasks`, `/tasks`) en lugar de una con vista contextual] → Aceptado por claridad de guardas y para preservar `/admin/* = admin-only`.

## Migration Plan

1. Migración Drizzle nueva (`0003_*`):
   - `ALTER TABLE task ADD COLUMN responsible_id text REFERENCES user(id) ON DELETE SET NULL;`
   - `CREATE INDEX task_responsible_id_idx ON task(responsible_id);`
   - `CREATE TABLE task_assignee (task_id text NOT NULL REFERENCES task(id) ON DELETE CASCADE, user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE, PRIMARY KEY (task_id, user_id));`
   - `CREATE INDEX task_assignee_user_id_idx ON task_assignee(user_id);`
2. Drizzle snapshot + journal actualizados.
3. Sin backfill: todas las tareas existentes quedan con `responsible_id = NULL` y sin assignees. Las que están `active` siguen visibles para admin; los members empezarán a ver tareas solo cuando un admin las asigne.
4. Despliegue: idempotente; rollback = revertir migración (DROP de la columna y la tabla). Las tareas conservan todos sus datos.

## Open Questions

Ninguna abierta en este momento. Las decisiones D1-D11 cierran las preguntas surgidas en exploración.
