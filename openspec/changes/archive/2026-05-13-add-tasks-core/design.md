## Context

Docentix corre sobre Next.js 16 (proxy.ts, server actions) + React 19, persistencia en Postgres con Drizzle ORM, autenticación y multi-tenancy con Better Auth + organization plugin. Las tablas `user`, `organization`, `member` ya existen (ver `next-app/lib/db/schema/auth.ts`). `member.role` permite valores como `member`, `admin`, `owner` (consistente con `deriveMenuRole` en `account-shell`). Las server actions de mutaciones siguen el patrón validación Zod + lógica explícita (ver propuestas previas archivadas: `account-organizations`, `super-organizations`).

No existe ninguna entidad de trabajo previa. Este change introduce la primera (`Task`), pensada para ser la base sobre la que más adelante se monten asignaciones, documentos, comentarios y checklist (cada una en su propio change).

## Goals / Non-Goals

**Goals:**
- Modelo de tarea persistido, aislado por organización, con autorización por rol de membresía.
- Transiciones de `visibility` y `status` validadas en server action con respaldo de CHECK constraints en DB para los enums.
- Posibilidad de que cualquier admin/owner de la organización vea, edite y administre todas las tareas, incluyendo "tomar posesión".
- Listado base con filtros mínimos (`visibility`, `status`) y ordenamiento determinista.
- UI mínima en `/admin/tasks` en español neutral con primitivas shadcn + Phosphor icons.

**Non-Goals:**
- Asignación de tareas a usuarios no autores. (Futuro change.)
- Documentos adjuntos, comentarios, checklist anidado. (Futuros changes.)
- Enforcement automático del plazo (e.g., notificaciones, auto-archive cuando `dueAt` pasa). (Futuro change.)
- Vistas para `member` regular o usuarios sin rol admin/owner. El panel `/app` no se toca.
- Auditoría / historial de cambios (sólo `createdAt` y `updatedAt`).
- Bulk operations, paginación avanzada, búsqueda full-text.
- Real-time updates (no websockets ni revalidaciones reactivas más allá de `revalidatePath`).

## Decisions

### Decisión 1: Drizzle pg-core `pgEnum` vs `text` + CHECK constraint

Optamos por **`text` + CHECK constraint** con valores literales para `visibility` y `status`.

**Alternativa considerada:** `pgEnum` de Drizzle.

**Rationale:**
- `pgEnum` genera tipos enumerados de Postgres que son difíciles de evolucionar: agregar/quitar/renombrar valores requiere `ALTER TYPE ... ADD VALUE` (no transaccional en algunas versiones), reordenar es prácticamente imposible sin recrear el tipo.
- `text` + CHECK es trivial de migrar: cambiar el CHECK constraint en una nueva migración. Cuesta lo mismo en rendimiento (Postgres lo trata como string corto). Mantiene los enums "vivos" en una sola fuente de verdad legible (el SQL del CHECK + el enum de Zod en TS).
- Patrón ya usado implícitamente en `member.role` y `user.role` (`text` sin enum nativo).

**Consecuencia:** El módulo del modelo exporta constantes (`TASK_VISIBILITY = ["draft", "active", "archived"] as const`) que se usan tanto para el CHECK en la migración como para el `z.enum(...)` en Zod.

### Decisión 2: Validación de transiciones — Zod + lógica de action, NO trigger en DB

Las transiciones legales viven en una tabla pura en TypeScript (`isVisibilityTransitionAllowed(from, to)` y equivalente para `status`). La server action carga la tarea actual, valida la transición contra la tabla, y persiste. El CHECK en DB sólo garantiza el conjunto de valores válidos del enum, no la transición.

**Alternativa considerada:** Trigger `BEFORE UPDATE` en Postgres que valide transiciones.

**Rationale:**
- Las transiciones son lógica de dominio, no de integridad de datos. Vivir en la action las hace fáciles de testear, leer y cambiar.
- Un trigger duplicaría la lógica en SQL (más difícil de mantener consistente) y produciría errores genéricos de DB difíciles de mapear a UI.
- La autorización (admin/owner) ya vive en la action y no se puede mover a DB sin RLS, que es desproporcionado para esta etapa.
- Riesgo de "saltarse" la action: bajo, dado que todo acceso pasa por server actions tipadas; cualquier acceso directo a DB en el futuro deberá replicar la validación o reutilizar un helper compartido.

**Consecuencia:** Helper puro `transitions.ts` con funciones idempotentes y testeables; las actions las invocan antes de cualquier UPDATE.

### Decisión 3: `dueAt` requerido al activar — validado en action, columna sigue siendo nullable

`dueAt` queda como `timestamp with time zone NULL` en la tabla. La server action `transitionVisibility` rechaza `draft → active` si la tarea no tiene `dueAt` ni se provee uno en el payload.

**Alternativa considerada:** CHECK constraint que prohíba `visibility = 'active' AND dueAt IS NULL`.

**Rationale:**
- Una tarea `draft` legítimamente puede no tener `dueAt`. Mantener la columna nullable refleja eso directamente.
- Un CHECK que vincule `visibility` con `dueAt` complicaría futuros cambios (e.g., si en un change posterior una tarea `archived` puede haber perdido su `dueAt`).
- La regla "para activar necesitas plazo" es de dominio (validable y reportable en UI con un mensaje claro), no de integridad estructural.

**Consecuencia:** La action devuelve un error de validación tipado (`{ field: "dueAt", code: "REQUIRED_FOR_ACTIVE" }`) que la UI puede mapear a un mensaje en español neutral.

### Decisión 4: Autorización — helper único `requireOrgAdmin(session)`

Se introduce `next-app/lib/auth/org-guards.ts` (o se extiende uno existente si aparece durante apply) con un helper que resuelve el `activeOrganizationId` de la sesión, consulta `member` para ese par `(userId, organizationId)`, y devuelve `{ orgId, userId, role }` si `role ∈ {admin, owner}` o lanza un error de autorización en caso contrario. Todas las actions de tareas usan este helper como primera línea.

**Alternativa considerada:** Validar en cada action manualmente.

**Rationale:**
- DRY. Una sola fuente de verdad para la regla "admin/owner de la org activa".
- Si más adelante se quiere extender (e.g., aceptar otra membresía), un solo punto de cambio.
- Mantiene las actions enfocadas en la lógica de tarea, no en autorización.

**Consecuencia:** Cada action invoca `const { orgId, userId } = await requireOrgAdmin();` al inicio. Si la sesión no tiene org activa o el rol no califica, se aborta antes de tocar la tabla.

### Decisión 5: Aislamiento multi-tenant — sin RLS, con guard en server action + filtro `organizationId` en TODA query

Toda query sobre la tabla `task` SHALL incluir `WHERE organization_id = $orgId` con el `orgId` resuelto por `requireOrgAdmin`. No se usa Row-Level Security de Postgres en esta etapa.

**Alternativa considerada:** RLS con `current_setting('app.current_org')`.

**Rationale:**
- RLS añade complejidad operacional (configuración de conexión, sesión Postgres con SET LOCAL) que excede el alcance del change.
- Mientras todo acceso pase por server actions con `requireOrgAdmin`, el invariante se mantiene.
- Riesgo aceptado: filtraciones por queries directas mal escritas en el futuro. Mitigación: query helpers tipados que reciben siempre `orgId` como primer parámetro.

**Consecuencia:** Un módulo `next-app/lib/tasks/queries.ts` expone funciones tipadas `listTasks({ orgId, filters })`, `getTaskById({ orgId, id })`, etc., todas con `orgId` como argumento obligatorio.

### Decisión 6: Tomar posesión — acción separada, NO permitir cambiar `authorId` arbitrariamente

La acción `claimAuthorship` sólo permite SET `authorId = currentUserId`. No existe API para reasignar a un tercero.

**Rationale:**
- "Tomar posesión" es un caso de uso concreto (autor se fue, otro admin quiere hacerse cargo). Una API genérica de reasignación abriría preguntas (¿a quién?, ¿con qué notificación?) que no están en alcance.
- Reduce superficie de ataque y mantiene la action trivialmente segura.

**Consecuencia:** Botón explícito en la UI ("Tomar posesión"), no un selector de autor.

### Decisión 7: UI con shadcn manual + Phosphor icons, copy en español neutral

Se usan primitivas existentes de `components/ui/*` y se compone una vista bajo `components/admin/tasks/`. Las nuevas primitivas que falten se agregan vía `npx shadcn@latest add <name>` (mantiene el estilo del registry). Iconos vía `@phosphor-icons/react`. Copy: `tú` + conjugación neutra (`Crea`, `Selecciona`, `Elige`, `Edita`).

**Alternativa considerada:** Lucide icons o componentes propios.

**Rationale:**
- `next-app/AGENTS.md` lo manda explícitamente: shadcn-first, Phosphor para iconos, no Lucide.
- Spanish neutral es regla global de UI (CLAUDE.md).

### Decisión 8: Identificadores `text` con generación lado app

`task.id` es `text PRIMARY KEY` generado por `crypto.randomUUID()` en la app (consistente con cómo Better Auth genera ids de `user`, `organization`, `member`).

**Alternativa considerada:** `uuid` nativo de Postgres con `gen_random_uuid()`.

**Rationale:**
- Consistencia con el resto del schema (todo es `text`).
- Permite generar el id antes de la inserción (útil para retornos optimistas y logging).

### Decisión 9: Revalidación de cache — `revalidatePath` puntual

Después de cada mutación exitosa, la action invoca `revalidatePath("/admin/tasks")`. No se usan tags ni revalidación masiva.

**Rationale:**
- Patrón estándar de Next.js 16 para mutaciones de admin panels.
- Mantiene la complejidad baja; si más adelante el listado se vuelve pesado, se puede migrar a tags.

## Risks / Trade-offs

- **Lógica de transición vive sólo en TypeScript** → Mitigación: helper puro testeable + tabla declarativa de transiciones; cualquier futuro acceso a DB debe pasar por las actions/queries del módulo `tasks`. Documentar en `lib/tasks/README.md` o el propio módulo.
- **Sin RLS** → Mitigación: `requireOrgAdmin` + filtro `organizationId` obligatorio en helpers de query. Riesgo aceptado para la etapa.
- **`text` vs `pgEnum`** → Pérdida menor: el cliente Drizzle infiere `string` en lugar del enum nativo. Mitigación: tipar manualmente con `as const` y reusar el tipo desde Zod.
- **Listado sin paginación** → Para organizaciones con muchas tareas el query puede volverse pesado. Mitigación: índice por `organizationId`; agregar paginación en un change futuro si aparece presión real (YAGNI por ahora).
- **`claimAuthorship` idempotente sin error** → Trade-off de UX: el botón puede estar visible para el autor actual si la UI no lo oculta. Mitigación: ocultar el botón en la UI cuando `task.authorId === currentUserId`.
- **CHECK constraints en migración** → Si en un futuro se agrega un valor al enum, hay que actualizar el CHECK Y la constante TS Y la migración. Mitigación: una sola constante exportada + un test que compara la lista con la migración (opcional, no obligatorio en este change).

## Migration Plan

1. **Pre-deploy**: revisar la migración generada por Drizzle Kit; verificar que el CHECK constraint incluya los tres valores de `visibility` y los tres de `status`, y que los índices por `organizationId` y `authorId` estén presentes.
2. **Deploy**: aplicar migración con `drizzle-kit push` (o el flujo configurado en `drizzle.config.ts`). La tabla nace vacía; no hay backfill.
3. **Rollback**: la migración inversa simplemente drop `task`. No hay datos a preservar en esta primera versión.
4. **Verificación post-deploy**: smoke test manual desde `/admin/tasks` (crear → activar con `dueAt` → transicionar a `in_progress` → `done`; verificar que `pending → done` directo falla; verificar que otro admin ve la tarea y puede tomar posesión).

## Open Questions

- ¿Necesitamos un índice compuesto `(organizationId, visibility)` o `(organizationId, status)` ya, o esperamos a observar carga real? **Default**: empezamos con índice simple por `organizationId` y agregamos compuestos cuando haya señal de performance.
- ¿La acción "Tomar posesión" debe notificar al autor anterior? **Default**: no, queda fuera de alcance hasta que exista un sistema de notificaciones (futuro change).
