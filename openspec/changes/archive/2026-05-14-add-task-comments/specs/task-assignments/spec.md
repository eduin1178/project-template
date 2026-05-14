## MODIFIED Requirements

### Requirement: Contrato `TaskCapabilities` extendido con `canComment`

El sistema SHALL extender el contrato `TaskCapabilities` (introducido en `add-tasks-inbox-and-admin-edit`) con un nuevo campo booleano `canComment` que las rutas `/admin/tasks` y `/tasks` calculan server-side por cada tarea visible. `canComment` SHALL ser true si y solo si el viewer cumple la misma regla de visibilidad de la tarea: `admin`/`owner` siempre; `member` solo si la tarea está en `visibility = 'active'` Y el viewer es autor, responsable o assignee de la tarea.

El detail pane SHALL usar `canComment` para mostrar u ocultar el composer del panel de comentarios. La autorización final vive en la server action `createComment`; `canComment` es una proyección server-side que evita renderizar el composer cuando la acción fallaría.

#### Scenario: Admin tiene canComment = true en cualquier visibility
- **WHEN** un admin u owner abre el detalle de una tarea de su organización (cualquier visibility)
- **THEN** la tarea llega con `capabilities.canComment = true`

#### Scenario: Member responsable de tarea active tiene canComment = true
- **WHEN** un `member` con `responsibleId = me` abre el detalle de una tarea con `visibility = "active"`
- **THEN** la tarea llega con `capabilities.canComment = true`

#### Scenario: Member assignee de tarea active tiene canComment = true
- **WHEN** un `member` presente en `task_assignee` abre el detalle de una tarea con `visibility = "active"`
- **THEN** la tarea llega con `capabilities.canComment = true`

#### Scenario: Member autor de tarea active tiene canComment = true
- **WHEN** un `member` que es `authorId` abre el detalle de su tarea con `visibility = "active"`
- **THEN** la tarea llega con `capabilities.canComment = true`

#### Scenario: Member NO admin sobre tarea draft tiene canComment irrelevante
- **WHEN** un `member` regular no tiene visibilidad sobre una tarea `draft`
- **THEN** la tarea ni siquiera llega al detail pane del member; no se evalúa `canComment` (regla de visibilidad ya filtra)
