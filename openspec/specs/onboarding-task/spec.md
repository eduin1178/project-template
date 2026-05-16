# onboarding-task Specification

## Purpose

Creación automática de una tarea de onboarding cuando un usuario acepta exitosamente una invitación a una institución (tabla `invitation` del plugin `organization` de Better Auth). Cubre los dos caminos de aceptación: (a) admin u owner invita a un nuevo miembro, y (b) super_admin invita al admin de una institución recién creada. La capability define la atomicidad transaccional, los campos fijos de la tarea (título, descripción, visibility, status, dueAt), el contenido canónico de la descripción y del checklist inicial en español neutral, las reglas de idempotencia por par `(responsibleId, organizationId)`, y el contrato del helper interno de creación que opera sin guard de autorización para uso server-side.

## Requirements

### Requirement: Creación automática de tarea de onboarding al aceptar invitación a institución

El sistema SHALL crear automáticamente una tarea de onboarding cuando un usuario acepta exitosamente una invitación a una institución (fila en la tabla `invitation` del plugin `organization` de Better Auth con `status` que pasa a `accepted`). El alcance SHALL cubrir los dos caminos de aceptación:

1. Admin u owner de una institución invita a un nuevo miembro (`role ∈ {"admin", "member"}` en la invitación).
2. Super_admin invita a un admin como contraparte de una institución recién creada (`role = "admin"`, `inviterId` apunta al super_admin).

La creación de la tarea SHALL ocurrir en la misma transacción de base de datos que finaliza la aceptación. Si la transacción de aceptación revierte por cualquier razón, la tarea NO SHALL persistir.

La creación de la tarea SHALL NO ejecutarse si la invitación expira, se rechaza, o se elimina sin haber sido aceptada.

#### Scenario: Admin invita member y member acepta
- **WHEN** un admin de una institución invita a un nuevo miembro y el invitado acepta la invitación a través de `/accept-invitation`
- **THEN** al finalizar la transacción de aceptación existe una fila en `task` con `responsibleId` igual al `user.id` del invitado, `organizationId` igual al de la invitación, y los valores definidos por esta capability

#### Scenario: Super invita admin y admin acepta
- **WHEN** un super_admin crea una institución, invita a un admin, y el invitado acepta
- **THEN** al finalizar la transacción de aceptación existe una fila en `task` con `responsibleId` igual al `user.id` del invitado y `organizationId` igual al de la institución recién creada

#### Scenario: Invitación expira sin aceptación
- **WHEN** una invitación a una institución expira (`expiresAt < now()`) sin que el invitado la acepte
- **THEN** NO se crea ninguna fila en `task` ligada al email invitado

#### Scenario: Invitación eliminada antes de aceptar
- **WHEN** el super_admin o admin elimina una invitación `pending` antes de que sea aceptada
- **THEN** NO se crea ninguna fila en `task`

#### Scenario: Rollback de la transacción de aceptación
- **WHEN** la inserción del `member` falla y la transacción de aceptación revierte
- **THEN** NO queda ninguna fila en `task` parcialmente creada para ese usuario y esa institución

### Requirement: Atribución y campos de la tarea de onboarding

La tarea de onboarding SHALL crearse con los siguientes valores fijos:

- `title`: `"Aprender a usar Docentix"`
- `description`: contenido fijo descrito en el requirement "Contenido de la tarea de onboarding".
- `visibility`: `"active"`
- `status`: `"pending"`
- `dueAt`: `NOW() + 7 días` calculado al momento de la creación.
- `responsibleId`: el `user.id` del invitado que acaba de aceptar la invitación.
- `authorId`: `invitation.inviterId` (el super_admin, owner o admin que originó la invitación). Como fallback defensivo, si `inviterId` no puede resolverse a un `user` existente al momento de la inserción, el sistema SHALL usar el `user.id` del invitado como `authorId`.
- `organizationId`: `invitation.organizationId`.

#### Scenario: Atribución a admin invitador
- **WHEN** un admin con `user.id = X` invita a un member que acepta
- **THEN** la tarea creada tiene `authorId = X` y `responsibleId = invitee.id`

#### Scenario: Atribución a super invitador
- **WHEN** un super_admin con `user.id = S` invita al admin de una nueva institución que acepta
- **THEN** la tarea creada tiene `authorId = S` y `responsibleId = invitee.id`

#### Scenario: Fallback de autoría si inviterId no resuelve
- **WHEN** la invitación tiene `inviterId` que no apunta a un `user` existente al momento de la aceptación
- **THEN** la tarea se crea con `authorId = invitee.id` (autoría del propio invitado)

#### Scenario: dueAt a 7 días
- **WHEN** se crea la tarea de onboarding en el instante T
- **THEN** `dueAt` se persiste como T + 7 días con la precisión que use el resto del sistema

#### Scenario: Tarea nace activa y pendiente
- **WHEN** se crea la tarea de onboarding
- **THEN** `visibility = "active"` y `status = "pending"`, sin pasar por estado `draft`

### Requirement: Contenido de la tarea de onboarding

La descripción de la tarea de onboarding SHALL ser un texto fijo, en español neutral (segunda persona singular `tú`, sin voseo), que enumere las funciones principales del producto con un nombre corto y una descripción breve para cada una. El contenido canónico SHALL ser:

```
Bienvenido a Docentix. Estas son las funciones principales que te ayudarán a empezar:

• Panel — visualiza tus tareas y actividad reciente desde el dashboard de tu institución.
• Tareas — crea, asigna y haz seguimiento del trabajo con responsables, fechas de vencimiento y estados.
• Checklist — divide cada tarea en pasos verificables.
• Documentos — adjunta y descarga archivos relacionados con cada tarea.
• Comentarios — conversa con tu equipo dentro de cada tarea.
• Miembros — invita personas a tu institución y gestiona sus roles.
• Notificaciones — recibe alertas de invitaciones, cambios de estado, vencimientos y nuevos comentarios.
• Perfil — completa tus datos personales y preferencias.
```

#### Scenario: Descripción contiene las ocho funciones
- **WHEN** se inspecciona la descripción de la tarea de onboarding creada al aceptar una invitación
- **THEN** contiene las ocho funciones (Panel, Tareas, Checklist, Documentos, Comentarios, Miembros, Notificaciones, Perfil) con sus textos breves

#### Scenario: Copy en español neutral
- **WHEN** se inspecciona la descripción
- **THEN** usa segunda persona singular `tú` (`visualiza`, `crea`, `divide`, `adjunta`, `conversa`, `invita`, `recibe`, `completa`) y NO contiene voseo (`visualizá`, `creá`, `dividí`, `adjuntá`, `conversá`, `invitá`, `recibí`, `completá`) ni la palabra "Organización"

### Requirement: Checklist inicial de la tarea de onboarding

La tarea de onboarding SHALL crearse con un checklist inicial de ocho ítems, todos en estado no marcado (`checked = false`), en orden estable. Los ítems canónicos SHALL ser, en este orden:

1. `"Explorar el panel principal de mi institución"`
2. `"Completar mi perfil"`
3. `"Crear mi primera tarea"`
4. `"Agregar un checklist a una tarea"`
5. `"Adjuntar un documento a una tarea"`
6. `"Dejar un comentario en una tarea"`
7. `"Revisar la lista de miembros de la institución"`
8. `"Configurar mis preferencias de notificaciones"`

Cada ítem SHALL crearse como una fila en `taskChecklistItem` ligada al `taskId` de la tarea de onboarding. El orden SHALL preservarse mediante orden de inserción (los ítems se insertan secuencialmente y la UI los lista por `createdAt` ascendente, conforme a `task-checklist`).

#### Scenario: Checklist contiene los ocho ítems en orden
- **WHEN** se inspecciona el checklist de la tarea de onboarding inmediatamente después de su creación
- **THEN** existen exactamente ocho filas en `taskChecklistItem` con los labels indicados, en el orden dado, con `checked = false` y `taskId` apuntando a la tarea

#### Scenario: Items en español neutral
- **WHEN** se inspeccionan los labels del checklist
- **THEN** todos los labels usan formas neutras (`Explorar`, `Completar`, `Crear`, `Agregar`, `Adjuntar`, `Dejar`, `Revisar`, `Configurar`) y NO contienen voseo ni la palabra "Organización"

#### Scenario: El invitado puede marcar items del checklist
- **WHEN** el `responsibleId` de la tarea de onboarding marca un ítem del checklist
- **THEN** la operación se persiste según las reglas existentes de la capability `task-checklist`

### Requirement: Idempotencia de la creación de tarea de onboarding

El sistema SHALL evitar duplicar la tarea de onboarding para el mismo par `(responsibleId, organizationId)`. Si al momento de crear la tarea ya existe en `task` una fila con `organizationId` igual al de la invitación, `responsibleId` igual al del invitado y `title = "Aprender a usar Docentix"`, el sistema SHALL reutilizar esa fila existente y NO SHALL insertar una nueva.

#### Scenario: Segunda aceptación no duplica tarea
- **WHEN** un usuario que ya tiene una tarea de onboarding en una institución (porque ya aceptó previamente una invitación a esa institución) acepta otra invitación a la misma institución
- **THEN** NO se crea una segunda fila en `task` con el mismo título; la tarea existente permanece intacta

#### Scenario: Aceptación en distintas instituciones crea tareas independientes
- **WHEN** un mismo usuario acepta invitaciones a dos instituciones distintas
- **THEN** se crea una tarea de onboarding por institución, cada una con su `organizationId` correspondiente

### Requirement: Helper interno separado del entry point con guard

La creación de la tarea de onboarding SHALL realizarse a través de un helper interno del módulo de tareas que NO SHALL exigir que el invocador sea admin u owner de la institución. Este helper SHALL ser distinto de la server action pública `createTask()`, que mantiene su guard `requireOrgAdmin()`. La server action pública SHALL delegar su lógica de inserción en el mismo helper interno, de modo que ambos caminos (creación manual por admin y creación automática por sistema) comparten la mecánica de persistencia.

#### Scenario: Helper interno disponible para el flujo de aceptación
- **WHEN** se inspecciona `lib/tasks/`
- **THEN** existe una función interna (no expuesta como server action al cliente) que crea una tarea sin invocar `requireOrgAdmin`, consumible desde otros módulos server-side

#### Scenario: createTask público mantiene su guard
- **WHEN** un usuario sin rol admin/owner invoca la server action pública `createTask`
- **THEN** la action falla con error de autorización antes de tocar la base, conforme a `tasks-core`

#### Scenario: Ambos caminos comparten la mecánica de inserción
- **WHEN** se inspecciona el código de `createTask` y del helper de onboarding
- **THEN** ambos delegan la inserción concreta de la fila `task` en la misma función interna
