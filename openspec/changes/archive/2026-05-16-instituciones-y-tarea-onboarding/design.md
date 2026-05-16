## Context

Docentix tiene hoy dos puntos de fricción en torno al onboarding de un usuario a una institución:

1. **Lenguaje**: la UI usa "Organización" — término genérico, técnicamente correcto (alineado con el plugin `organization` de Better Auth) pero comunicacionalmente débil para una audiencia de instituciones educativas.
2. **Primera experiencia**: al aceptar una invitación, el usuario aterriza en una app sin guía. Las funciones del producto (panel, tareas, checklist, documentos, comentarios, miembros, notificaciones, perfil) están dispersas y no hay un punto de entrada que las presente.

Los dos flujos de aceptación que importan son:

- **Admin/owner → member**: `app/accept-invitation/actions.ts:acceptForUser()`. Acepta la invitación de la tabla `invitation` (plugin organization de Better Auth), inserta el `member` con el rol invitado y marca la invitación como `accepted`.
- **Super → admin de nueva institución**: el mismo `acceptForUser()` cubre este caso porque el super también escribe en `invitation` (`role = "admin"`, `inviterId = super.id`). El path por el que el usuario llega es distinto (signup desde `/accept-invitation`), pero la mutación final es la misma.

El modelo de tareas existente (`tasks-core`, `task-checklist`) tiene todo lo que necesitamos: `title`, `description`, `dueAt`, `visibility`, `status`, `responsibleId`, `authorId`, `organizationId`, y un `taskChecklistItem` enlazado por `taskId`. La función `createTask()` valida con `requireOrgAdmin()`, lo cual no encaja con un flujo donde el actor es el invitado (que puede no ser admin).

El producto está hardcoded en español; no hay i18n. El cambio de copy es un find-replace dirigido.

## Goals / Non-Goals

**Goals:**

- Que toda la UI hable de "Institución" en lugar de "Organización", manteniendo intactos los identificadores técnicos.
- Que un usuario que acepta una invitación tenga, dentro de su institución, una tarea visible y accionable que lo guíe por las funciones principales del producto.
- Establecer la regla de copy como convención persistente en `next-app/AGENTS.md`.
- No introducir un sistema de plantillas reutilizables ni i18n: una sola plantilla hardcoded, contenido directamente embebido en código.

**Non-Goals:**

- Cambiar el modelo de datos. No se modifica el schema de `task`, ni de `taskChecklistItem`, ni de `invitation`, ni de `organization`.
- Cambiar la firma pública de `createTask()`. Sigue requiriendo admin/owner; el cambio es interno (extracción de un helper sin guard).
- Crear tarea de onboarding para super-admins puros (que no aceptan invitación a una institución).
- Modificar el copy de los emails de invitación más allá del rename.
- Tocar el flujo OAuth con Google o el signup con email/password de `/accept-invitation`.

## Decisions

### D1. Estado inicial de la tarea: `visibility: active`, `status: pending`, `dueAt: now + 7 días`

La tarea nace **visible y accionable**. La alternativa era nacer en `draft`, pero entonces el invitado no la vería (la regla de visibilidad de `tasks-core` no muestra draft a no-autores). Para activar se requieren `dueAt` y `responsibleId`; ambos se proveen al crear: `responsibleId = invitee.id`, `dueAt = NOW() + 7 días`. El plazo de 7 días alinea con el plazo de expiración de invitaciones existente y da un horizonte razonable para completar el onboarding sin presionar.

### D2. Atribución: `authorId = invitation.inviterId`, `responsibleId = invitee.id`

El "autor" de la tarea es quien invitó (super, owner o admin) — son las únicas figuras autorizadas para crear tareas en `tasks-core`. Esto mantiene la coherencia de auditoría: cualquier admin puede ver quién originó la tarea y atarla al invitador concreto. El responsable es el invitado, lo cual le da poder de mover el `status` según las reglas de `task-assignments`.

**Fallback**: si por alguna razón el `inviterId` no se puede resolver (FK rota, usuario eliminado, etc.), usar el propio invitado como autor. Es defensivo — en la práctica no debería disparar.

### D3. Refactor: extraer `createTaskInternal()`

`createTask()` tiene `requireOrgAdmin()` en el cuerpo. El flujo de aceptación corre fuera de ese contexto (el invitado no es admin todavía cuando se ejecuta la lógica). Dos opciones:

| Opción | Pros | Contras |
|---|---|---|
| A — Bypass de guard con un flag (`skipAuth: true`) | un solo entry point | enmascara el modelo, fácil de mal usar |
| B — Extraer `createTaskInternal()` sin guard, mantener `createTask()` con guard que delega | separación limpia API pública / operación sistema | un archivo más en el módulo |

Elegimos **B**. El internal vive en `lib/tasks/actions.ts` (no exportado al cliente; sólo consumible desde server). El public `createTask()` queda como wrapper: `requireOrgAdmin()` → `createTaskInternal(input)`.

### D4. Helper de onboarding: `createOnboardingTask({ inviterId, inviteeId, organizationId })`

Centraliza:
- La plantilla de `title`/`description` (hardcoded, sin parámetros).
- La lista canónica de ítems de checklist.
- El cómputo de `dueAt = NOW() + 7 días`.
- La idempotencia (ver D5).

Vive en `lib/tasks/onboarding.ts` (módulo nuevo, alineado con el patrón `lib/tasks/checklist-actions.ts`). Se invoca desde `acceptForUser()`. No se expone como server action al cliente.

### D5. Idempotencia: una sola tarea de onboarding por (usuario, institución)

Si el helper se invoca dos veces para el mismo par `(inviteeId, organizationId)` (escenario raro pero posible si el flujo de aceptación tuviera un retry), no debe duplicar. Implementación:

- Antes del insert, query `SELECT id FROM task WHERE organizationId = ? AND responsibleId = ? AND title = 'Aprender a usar Docentix' LIMIT 1`.
- Si existe, retornar `{ ok: true, data: { id: existing.id, created: false }}`.
- Si no, crear y retornar `{ ok: true, data: { id: new.id, created: true }}`.

No usamos índice único porque el caso es raro y un check application-side es suficiente.

### D6. Transacción: misma transacción que el insert del member

`acceptForUser()` ya usa una transacción para encadenar (validar invitación → insert/upsert user → insert member → marcar invitación). Extender esa transacción para incluir creación de la tarea + checklist. Ventaja: si algo falla, todo revierte; el usuario nunca queda en estado "miembro sin tarea de onboarding" parcial.

**Manejo de error**: si la creación de la tarea falla por causa no crítica (timeout transitorio, etc.), aceptar que el rollback total es el comportamiento correcto — el usuario reintenta la aceptación. No se hace fire-and-forget: la consistencia gana sobre la disponibilidad para este flujo de baja frecuencia.

### D7. Contenido de la tarea: hardcoded en el helper

```
Title: "Aprender a usar Docentix"

Description (markdown plano, sin parametrizar):
  Bienvenido a Docentix. Estas son las funciones principales que te ayudarán a empezar:

  • Panel — visualiza tus tareas y actividad reciente desde el dashboard de tu institución.
  • Tareas — crea, asigna y haz seguimiento del trabajo con responsables, fechas de vencimiento y estados.
  • Checklist — divide cada tarea en pasos verificables.
  • Documentos — adjunta y descarga archivos relacionados con cada tarea.
  • Comentarios — conversa con tu equipo dentro de cada tarea.
  • Miembros — invita personas a tu institución y gestiona sus roles.
  • Notificaciones — recibe alertas de invitaciones, cambios de estado, vencimientos y nuevos comentarios.
  • Perfil — completa tus datos personales y preferencias.

Checklist (orden importa; todos sin marcar):
  1. Explorar el panel principal de mi institución
  2. Completar mi perfil
  3. Crear mi primera tarea
  4. Agregar un checklist a una tarea
  5. Adjuntar un documento a una tarea
  6. Dejar un comentario en una tarea
  7. Revisar la lista de miembros de la institución
  8. Configurar mis preferencias de notificaciones
```

Las funciones referenciadas en la descripción se mapean a capabilities reales del producto: `org-dashboard`, `tasks-core`, `task-checklist`, `task-documents`, `task-comments`, `account-organizations`, `email-templates`, `account-profile`. La lista de ítems del checklist es accionable (cada uno corresponde a una funcionalidad que existe hoy).

### D8. Rename UI: alcance y disciplina

Reemplazos a aplicar en strings visibles al usuario:

| Forma origen | Forma destino |
|---|---|
| Organización | Institución |
| organización | institución |
| Organizaciones | Instituciones |
| organizaciones | instituciones |

Reglas explícitas de NO-tocar:
- Identificadores TS/JS (`organizationId`, `organizationName`, `organization.logo`).
- Nombres de columnas y tablas (`organization`, `organizationId`).
- Rutas de API y de Better Auth (`/api/organization/*`).
- Comentarios técnicos en código.
- Specs en `openspec/specs/**` (estos siguen describiendo el modelo técnico).
- `AGENTS.md` cuando hablan del modelo o del plugin (excepto donde refieren al copy visible).

Las plantillas de email reciben el cambio porque el cuerpo del email es texto visible al usuario. Los parámetros (`{organizationName}`, etc.) son valores de DB y se imprimen como están.

### D9. Spanish neutral + Real Academia

Todo copy nuevo o modificado debe respetar la regla global: segunda persona singular `tú`, sin voseo. Esto aplica a la descripción de la tarea, los ítems del checklist y los strings UI tocados durante el rename.

## Risks / Trade-offs

- **[Riesgo]** Aceptar la invitación se vuelve más caro (más statements en la transacción). → **Mitigación**: el insert de la tarea y N items del checklist son operaciones rápidas; el flujo de aceptación ya es de baja frecuencia. Aceptable.
- **[Riesgo]** Si en el futuro se cambia la lista de funciones principales del producto, la descripción/checklist hardcoded queda desactualizada. → **Mitigación**: el helper centraliza el contenido en un solo archivo; cambiarlo es una edición puntual. No vale la pena un sistema de plantillas para una sola plantilla.
- **[Riesgo]** El refactor de `createTask()` puede romper consumidores. → **Mitigación**: la firma pública no cambia. Internamente `createTask()` queda como `requireOrgAdmin(); return createTaskInternal(...)`. Los call sites no se enteran.
- **[Trade-off]** Atribuir la tarea al `inviterId` significa que aparece en su lista "como autor" — admin puede ver una tarea más a su nombre. Es coherente con el modelo de `tasks-core` y no afecta UX.
- **[Riesgo]** El rename de UI puede atrapar matches en comentarios o JSDoc. → **Mitigación**: el apply debe revisar manualmente cada match; el linter de la build verifica que no se rompen referencias.
- **[Riesgo]** Tareas legacy creadas antes del cambio para usuarios ya invitados no tendrán onboarding. → **Mitigación**: el cambio aplica solo hacia adelante. No hay backfill — los usuarios existentes ya conocen el producto por contexto.

## Migration Plan

1. Cambio de copy: PR único. Si la modificación excede ~400 líneas cambiadas, partir en commits work-unit dentro del mismo PR (emails / accept-invitation / dashboards / AGENTS.md).
2. Refactor de tasks: extraer `createTaskInternal()`, agregar helper de onboarding, agregar hook en `acceptForUser()`.
3. Verificación manual con una invitación de prueba (admin → member y super → admin).
4. No hay migración de datos.
5. **Rollback**: revertir el commit. La tarea creada queda en BD pero es inofensiva (es una tarea normal del usuario).

## Open Questions

- ¿La descripción debe renderizarse como markdown o como texto plano en el detail pane? (Asumimos texto plano con saltos de línea; los `•` se ven correctamente. Si en el futuro el detail pane soporta markdown, no requiere migración.)
- ¿El checklist necesita un orden estable? Sí — el helper inserta los ítems en orden; la UI de `task-checklist` los muestra por `createdAt`. Esto se cumple naturalmente con inserts secuenciales.
