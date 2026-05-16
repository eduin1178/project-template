## Why

Docentix está dirigido a instituciones educativas, pero la UI usa "Organización" — un término genérico que no comunica el dominio del producto. Cambiar a "Institución" alinea el lenguaje del producto con su audiencia. Al mismo tiempo, los usuarios recién aceptados no tienen un punto de partida claro para conocer las funciones del producto; una tarea de onboarding creada automáticamente convierte la primera acción del usuario dentro de su institución en una guía interactiva.

Ambos cambios giran alrededor del mismo evento de entrada al producto (aceptar invitación a una institución), por eso se entregan juntos.

## What Changes

- Reemplazar la palabra "Organización" / "organización" por "Institución" / "institución" en toda la UI de usuario final: páginas, componentes, plantillas de email, validaciones, empty states, diálogos y tooltips.
- Conservar `organization` / `organizationId` / referencias al plugin `organization` de Better Auth / nombres de tablas, columnas, rutas de API, tipos, comentarios técnicos y specs de OpenSpec.
- Documentar la regla "Institución vs organization" en `next-app/AGENTS.md` con una referencia corta desde `/AGENTS.md`.
- Al aceptar una invitación a una institución (flujo admin/owner → miembro, y flujo super → admin de institución recién creada), crear automáticamente una tarea de onboarding asignada al invitado.
- La tarea de onboarding nace con `visibility: active`, `status: pending`, `dueAt: now + 7 días`, `responsibleId = invitado`, `authorId = invitation.inviterId` (con fallback al propio invitado si no se puede resolver), título `"Aprender a usar Docentix"`, descripción con las funciones principales del producto y un checklist con pasos verificables.
- Refactor de `createTask()` en `lib/tasks/actions.ts` para extraer `createTaskInternal()` sin guard de autorización; `createTask()` mantiene su `requireOrgAdmin()` y delega en el internal. El flujo de aceptación llama al internal a través de un helper `createOnboardingTask()`.
- El helper es idempotente: si ya existe una tarea de onboarding para el par (usuario, institución), no la duplica.

## Capabilities

### New Capabilities

- `onboarding-task`: Creación automática de una tarea de onboarding al aceptar una invitación a una institución, incluyendo plantilla de descripción, checklist inicial y reglas de idempotencia y atribución.

### Modified Capabilities

- `account-invitations`: El flujo de aceptación de invitación gana un efecto adicional (creación de la tarea de onboarding) que no debe bloquear la aceptación si falla por causa no crítica.
- `super-org-invitations`: Mismo efecto adicional en el flujo super → admin de institución recién creada.
- `tasks-core`: Se expone una operación interna `createTaskInternal()` separada del entry point con guard, para permitir creación de tareas por el sistema en flujos donde el actor no es admin.
- `ui-foundation`: Se incorpora la regla de copy "Institución vs organization" como convención de producto.

## Impact

- **Código (UI)**: archivos en `next-app/src/emails/**`, `next-app/src/app/accept-invitation/**`, dashboards y componentes que muestran el término "Organización" al usuario.
- **Código (server)**: `next-app/src/lib/tasks/actions.ts` (refactor), `next-app/src/lib/tasks/checklist-actions.ts` (posible helper bulk), `next-app/src/app/accept-invitation/actions.ts` (hook), y el handler equivalente para el flujo super → admin si vive aparte.
- **Schema DB**: sin cambios. Se usa el modelo existente de `task` + `taskChecklistItem`.
- **Documentación**: `next-app/AGENTS.md` (regla nueva) y `/AGENTS.md` (referencia corta).
- **Out of scope**: no se modifica el copy de los emails de invitación más allá del rename; no se introduce un sistema de plantillas de tareas reutilizable; no se introduce i18n; no se crea tarea para super-admins que no aceptan invitación a una institución concreta.
