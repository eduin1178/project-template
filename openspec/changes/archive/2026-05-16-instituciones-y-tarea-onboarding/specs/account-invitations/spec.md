## ADDED Requirements

### Requirement: Aceptación de invitación dispara la creación de la tarea de onboarding

Cuando la aceptación de una invitación nativa (`invitation`) emitida por un admin u owner se completa exitosamente, el sistema SHALL invocar el flujo de creación de tarea de onboarding descrito en la capability `onboarding-task`. La invocación SHALL ocurrir en la misma transacción que la inserción del `member` y el cambio de `status` de la invitación a `accepted`.

Si la creación de la tarea de onboarding falla por cualquier causa, la transacción de aceptación SHALL revertir completa: NO SHALL quedar `member` insertado sin tarea de onboarding asociada.

#### Scenario: Admin invita member, member acepta y obtiene tarea
- **WHEN** un member acepta una invitación emitida por un admin u owner desde `/accept-invitation`
- **THEN** al completarse la aceptación existe un `member` para esa institución Y una tarea de onboarding asignada al `responsibleId` igual al `user.id` del invitado, ambos creados en la misma transacción

#### Scenario: Falla en la creación de la tarea revierte la aceptación
- **WHEN** durante el flujo de aceptación la inserción de la tarea de onboarding falla por error de base
- **THEN** la transacción completa hace rollback: la invitación queda en `pending`, no se inserta `member` y no se crea tarea

#### Scenario: Aceptación de usuario nuevo (signup + accept) también crea tarea
- **WHEN** un usuario nuevo se registra mediante el flujo de `/accept-invitation` (email/password o Google) usando una invitación pending
- **THEN** al completarse la aceptación existe `member` Y tarea de onboarding asignada al usuario recién creado
