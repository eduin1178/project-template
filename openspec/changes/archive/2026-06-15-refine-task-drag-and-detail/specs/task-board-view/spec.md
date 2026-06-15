## MODIFIED Requirements

### Requirement: Drag-and-drop trazable en tablero
El sistema SHALL permitir arrastrar cards entre columnas de `status` únicamente
en modo `board`. Soltar una card sobre una columna de estado diferente y válida
SHALL mutar `task.status` directamente mediante la server action
`changeTaskStatus(taskId, newStatus)`, SIN abrir diálogo de justificación y SIN
exigir comentario. El cambio SHALL aplicarse con **actualización optimista**: la
card SHALL moverse a la columna destino de inmediato en la UI, antes de la
confirmación del servidor.

La UI SHALL validar en cliente, antes de mutar, los movimientos inválidos
conocidos: soltar en la misma columna (no-op), la transición directa
`pending → done` y soltar una card cuya `visibility` no sea `active`. Si la
server action falla por autorización, vencimiento o regla de transición, la UI
SHALL revertir la card a su columna previa y mostrar feedback de error. La server
action SHALL seguir siendo la fuente de verdad para permisos, vencimiento,
transición permitida y rollback transaccional.

#### Scenario: Drop válido cambia el estado al instante
- **WHEN** un usuario arrastra una card `active` desde `pending` hacia la columna `in_progress`
- **THEN** la card se mueve de inmediato a `in_progress` en la UI y el sistema invoca `changeTaskStatus(taskId, "in_progress")` sin comentario

#### Scenario: Drop inválido pending a done se rechaza
- **WHEN** un usuario arrastra una card desde `pending` hacia la columna `done`
- **THEN** la UI rechaza la intención o revierte la card sin invocar cambio de estado

#### Scenario: Error server-side revierte la card
- **WHEN** el usuario suelta una card pero `changeTaskStatus` falla por autorización, vencimiento o regla de transición
- **THEN** la card vuelve a su columna anterior y la UI muestra feedback de error sin persistir cambios

#### Scenario: Drop de tarea no activa se bloquea
- **WHEN** un usuario intenta arrastrar una card cuya `visibility` no es `active`
- **THEN** la UI bloquea el cambio y muestra feedback sin invocar la action

#### Scenario: Modo cards no tiene drag-and-drop
- **WHEN** un usuario cambia a `view=cards`
- **THEN** las tarjetas no ofrecen drop targets para cambiar `status`
