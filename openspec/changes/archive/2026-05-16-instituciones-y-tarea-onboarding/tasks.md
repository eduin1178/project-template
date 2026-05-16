## 1. Convención y documentación

- [x] 1.1 Agregar sección "Institución vs organization" en `next-app/AGENTS.md` con la regla completa y la lista de excepciones técnicas
- [x] 1.2 Agregar referencia corta desde `/AGENTS.md` raíz hacia `next-app/AGENTS.md` apuntando a la nueva sección

## 2. Rename UI: emails y aceptación de invitación

> Nota: la app vive en `next-app/` (sin `src/`). Las rutas reales usadas durante el apply son `next-app/lib/email/templates/*` y `next-app/app/accept-invitation/*`.

- [x] 2.1 Actualizar copy de `next-app/lib/email/templates/org-admin-welcome-email.tsx`: "organización" → "institución"
- [x] 2.2 Revisar `next-app/lib/email/templates/tenant-invitation-email.tsx`: no contenía la palabra "organización" en copy visible (solo el parámetro `organizationName`), no requirió cambios
- [x] 2.3 Revisar `next-app/lib/email/templates/**` para detectar otras menciones residuales y actualizarlas
- [x] 2.4 Actualizar copy de `next-app/app/accept-invitation/page.tsx`, `_components/accept-form.tsx`, `_components/accept-logged-in.tsx`
- [x] 2.5 Verificar que el fallback "tu organización" cuando `organizationName` no está definido use el copy nuevo

## 3. Rename UI: dashboards, componentes y páginas

- [x] 3.1 Buscar y actualizar menciones en `next-app/app/**/*.tsx` (páginas)
- [x] 3.2 Buscar y actualizar menciones en `next-app/components/**/*.tsx`
- [x] 3.3 Buscar y actualizar menciones en strings de validación y mensajes de error (server actions en `lib/tasks/actions.ts`, `app/account/organizations/[id]/actions.ts`, `app/super/(protected)/organizations/actions.ts`, etc.)
- [x] 3.4 Buscar y actualizar menciones en empty states, tooltips, labels de formularios, títulos de diálogos
- [x] 3.5 Verificar que NO se cambiaron identificadores TS/JS, columnas de DB, rutas de API ni comentarios técnicos durante el rename
- [x] 3.6 Verificar que el copy nuevo respeta español neutral (sin voseo)

## 4. Refactor de `createTask` → `createTaskInternal`

- [x] 4.1 Extraer función `createTaskInternal(input)` en módulo server-only `next-app/lib/tasks/internal.ts` que realiza el insert sin `requireOrgAdmin`
- [x] 4.2 Reescribir `createTask(input)` en `next-app/lib/tasks/actions.ts` para que mantenga `requireOrgAdmin()`, valide payload y delegue la inserción en `createTaskInternal`
- [x] 4.3 `createTaskInternal` acepta `authorId`, `responsibleId`, `organizationId`, `title`, `description`, `visibility`, `status`, `dueAt` y opcional `id` como payload explícito
- [x] 4.4 `createTaskInternal` vive en un archivo aparte con `import "server-only"`; no se expone como server action al cliente (actions.ts mantiene `"use server"`, internal.ts no)
- [x] 4.5 La firma pública de `createTask` y su contrato `ActionResult<{ id: string }>` se conservan; los call sites existentes no se modifican

## 5. Helper de onboarding

- [x] 5.1 Crear `next-app/lib/tasks/onboarding.ts` con la función `createOnboardingTask({ inviterId, inviteeId, organizationId }, executor?)`
- [x] 5.2 Helper computa `dueAt = NOW() + 7 días` internamente
- [x] 5.3 Helper usa constantes `ONBOARDING_TASK_TITLE = "Aprender a usar Docentix"`, `ONBOARDING_TASK_DESCRIPTION`, `visibility = "active"`, `status = "pending"`
- [x] 5.4 Fallback de `authorId`: el helper consulta `user` por `inviterId`; si no existe, usa `inviteeId`
- [x] 5.5 Idempotencia: query previa por `(organizationId, responsibleId, title)`; si existe, retorna sin duplicar
- [x] 5.6 Inserción de la tarea delega en `createTaskInternal`, pasando el executor (db o tx) recibido
- [x] 5.7 Los ocho ítems del checklist se insertan secuencialmente en `taskChecklistItem` con `checked = false`, preservando orden por orden de inserción
- [x] 5.8 Retorna `{ id: string, created: boolean }`

## 6. Hook en el flujo de aceptación

- [x] 6.1 `acceptForUser()` en `next-app/app/accept-invitation/actions.ts` invoca `createOnboardingTask` con `tx` dentro de la transacción
- [x] 6.2 `inviterId` se obtiene de `invitation.inviterId` (NOT NULL en el schema)
- [x] 6.3 El helper no captura errores: cualquier fallo se propaga y revierte la transacción completa (junto al insert de `member`)
- [x] 6.4 La ruta `app/accept-invitation/complete/route.ts` (callback OAuth Google) también invoca `createOnboardingTask` dentro de su propia transacción, garantizando que ambos caminos crean la tarea

## 7. Verificación funcional

- [x] 7.1 Caso admin → member: crear una invitación member desde un admin de tenant, aceptarla con un usuario nuevo, verificar que existe la tarea de onboarding con los campos correctos y los ocho ítems del checklist
- [x] 7.2 Caso super → admin: crear una institución desde super con un admin invitado, aceptar la invitación, verificar que la tarea de onboarding existe con `authorId = super.id`
- [x] 7.3 Caso idempotencia: simular doble invocación del helper para el mismo par usuario+institución y verificar que no se duplica
- [x] 7.4 Caso rollback: forzar un fallo en la creación de la tarea (por ejemplo, mediante DB stub) y verificar que la invitación queda `pending` y no se crea `member`
- [x] 7.5 Copy en plantillas de email y en `/accept-invitation` ya dice "Institución" / "institución" (verificado estáticamente; grep posterior solo encuentra menciones en `AGENTS.md` describiendo la regla y en `README.md` que es documentación técnica)
- [x] 7.6 `next-app/AGENTS.md` documenta la regla "Institución vs organization" en su propia sección; `/AGENTS.md` la referencia desde la sección "Responsabilidad de archivos AGENTS.md"
