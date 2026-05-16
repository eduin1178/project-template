## ADDED Requirements

### Requirement: Aceptación de invitación super → admin dispara la creación de la tarea de onboarding

Cuando la aceptación de una invitación emitida por un super_admin se completa exitosamente, el sistema SHALL invocar el flujo de creación de tarea de onboarding descrito en la capability `onboarding-task`. La invocación SHALL ocurrir en la misma transacción atómica que (a) crea o asocia al `user`, (b) crea el `member` con `role = "admin"`, y (c) marca la invitación con `status = "accepted"`.

Si la creación de la tarea falla, la transacción de aceptación SHALL revertir completa, consistente con la regla de atomicidad ya establecida en esta capability.

El `authorId` de la tarea de onboarding SHALL ser el `user.id` del super_admin que originó la invitación (`invitation.inviterId`), y el `responsibleId` SHALL ser el `user.id` del admin invitado.

#### Scenario: Super crea institución, admin acepta y obtiene tarea
- **WHEN** un super_admin crea una institución desde `/super/organizations/new` y el admin invitado acepta la invitación (signup + accept o accept logueado)
- **THEN** al completarse la aceptación existe `member` con `role = "admin"` Y una tarea de onboarding con `authorId = super.id`, `responsibleId = admin.id`, `organizationId` igual al de la institución recién creada, todo en la misma transacción

#### Scenario: Aceptación concurrente sigue siendo atómica
- **WHEN** dos requests intentan aceptar el mismo `invitationId` super → admin en paralelo
- **THEN** exactamente una transacción tiene éxito (con su tarea de onboarding incluida); la otra recibe error de invitación ya aceptada y no crea ninguna tarea

#### Scenario: Falla en la creación de la tarea revierte la aceptación super → admin
- **WHEN** durante el flujo de aceptación super → admin la inserción de la tarea de onboarding falla por error de base
- **THEN** la transacción completa hace rollback: la invitación queda en `pending`, no se inserta `member` y no se crea tarea
