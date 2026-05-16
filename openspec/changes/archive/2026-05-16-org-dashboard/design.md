## Context

Las rutas `/admin` y `/app` son stubs. El modelo de tareas ya está estabilizado: `task` con `visibility` (`draft|active|archived`) y `status` (`pending|in_progress|done`), `task_assignee` para el equipo de apoyo, `task_document.sizeBytes` para el almacenamiento, y `member` para usuarios por organización. La autorización por `activeOrganizationId` y rol ya está implementada en `lib/auth/guards.ts` y aplicada en las rutas existentes (`/admin/*` solo admin/owner; `/tasks` cualquier rol con organización activa).

Los stakeholders son admin/owner (que necesitan vista agregada de la organización) y miembros (que necesitan ver su propia carga). El dashboard es de solo lectura y server-rendered; no introduce mutaciones nuevas.

## Goals / Non-Goals

**Goals:**
- Una sola ida a Postgres por dashboard para minimizar latencia percibida (TTFB).
- Reutilizar el esquema actual sin migraciones.
- Mantener la estricta separación de scope admin vs member en queries y UI.
- Copy 100% en español neutral y componentes shadcn.
- Server components puros; sin hidratación de datos en cliente.

**Non-Goals:**
- Auto-refresh, websockets, polling, revalidate por tiempo.
- Filtros temporales configurables (las ventanas de 30 días y 7 días son fijas).
- Exportar dashboard, imprimir, generar PDF.
- Drill-down más allá del click en top-5 hacia el detalle de tarea.
- Paginación en top-5 (siempre 5).
- Nuevas mutaciones, server actions o endpoints REST.
- Dashboard para super-admin (esta change cubre solo admin/owner y member de una organización).

## Decisions

### Decisión 1: Una sola query agregada con CTEs por dashboard

Para admin y member, ejecutar **un único `db.execute(sql\`...\`)`** que use CTEs para calcular todos los KPIs y los top-5 en una sola ida. Los datos se devuelven en una fila con columnas escalares y arrays JSON para los top-5.

**Alternativas consideradas:**
- N queries paralelas con `Promise.all` (más legible, peor TTFB con DB remota).
- Un query por sección rehidratado con React Server Components individuales (más componentes, mismo problema de N round-trips).

**Por qué CTEs:** un solo round-trip vence a 6-8 queries paralelas en cualquier escenario de latencia >5 ms a la base. El query es complejo pero está concentrado en un solo archivo testeable (`lib/dashboard/queries.ts`).

**Estructura del query (admin):**

```sql
WITH active_tasks AS (
  SELECT id, status, due_at, responsible_id, created_at, updated_at
  FROM task
  WHERE organization_id = $1 AND visibility = 'active'
),
status_counts AS (
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending')     AS pending,
    COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
    COUNT(*) FILTER (WHERE status = 'done')        AS done,
    COUNT(*) FILTER (WHERE status != 'done' AND due_at < NOW()) AS overdue,
    COUNT(*) FILTER (WHERE status != 'done' AND due_at >= NOW() AND due_at < NOW() + INTERVAL '7 days') AS due_soon
  FROM active_tasks
),
window_30d AS (
  SELECT
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS created_30d,
    COUNT(*) FILTER (WHERE status = 'done' AND updated_at >= NOW() - INTERVAL '30 days') AS done_30d
  FROM active_tasks
),
top_pending AS (
  SELECT json_agg(row_to_json(t) ORDER BY t.created_at DESC) AS rows
  FROM (
    SELECT id, title, due_at, created_at
    FROM active_tasks
    WHERE status = 'pending'
    ORDER BY created_at DESC
    LIMIT 5
  ) t
),
top_in_progress AS (
  SELECT json_agg(row_to_json(t) ORDER BY t.updated_at DESC) AS rows
  FROM (
    SELECT id, title, due_at, updated_at
    FROM active_tasks
    WHERE status = 'in_progress'
    ORDER BY updated_at DESC
    LIMIT 5
  ) t
),
by_responsible AS (
  SELECT json_agg(row_to_json(r) ORDER BY r.open_count DESC) AS rows
  FROM (
    SELECT
      u.id AS user_id, u.name, u.email, u.image,
      COUNT(*) FILTER (WHERE at.status IN ('pending', 'in_progress')) AS open_count
    FROM active_tasks at
    JOIN "user" u ON u.id = at.responsible_id
    WHERE at.responsible_id IS NOT NULL
    GROUP BY u.id, u.name, u.email, u.image
    HAVING COUNT(*) FILTER (WHERE at.status IN ('pending', 'in_progress')) > 0
    ORDER BY open_count DESC
    LIMIT 5
  ) r
),
member_count AS (
  SELECT COUNT(*)::int AS total FROM member WHERE organization_id = $1
),
storage AS (
  SELECT COALESCE(SUM(td.size_bytes), 0)::bigint AS bytes
  FROM task_document td
  JOIN task t ON t.id = td.task_id
  WHERE t.organization_id = $1
)
SELECT
  status_counts.pending,
  status_counts.in_progress,
  status_counts.done,
  status_counts.overdue,
  status_counts.due_soon,
  window_30d.created_30d,
  window_30d.done_30d,
  top_pending.rows         AS top_pending,
  top_in_progress.rows     AS top_in_progress,
  by_responsible.rows      AS by_responsible,
  member_count.total       AS member_total,
  storage.bytes            AS storage_bytes
FROM status_counts, window_30d, top_pending, top_in_progress, by_responsible, member_count, storage;
```

**Member:** misma estructura con dos cambios:
- `active_tasks` se filtra adicionalmente por `responsible_id = $2 OR EXISTS (SELECT 1 FROM task_assignee WHERE task_id = task.id AND user_id = $2)`.
- Se elimina `by_responsible` y `member_count`.
- `storage` se reemplaza por `SELECT COALESCE(SUM(size_bytes), 0) FROM task_document WHERE uploader_id = $2`.

### Decisión 2: Módulo `lib/dashboard/queries.ts` con dos funciones puras

```ts
export type AdminDashboardData = { ... };
export type MemberDashboardData = { ... };

export async function getAdminDashboard(orgId: string): Promise<AdminDashboardData>;
export async function getMemberDashboard(orgId: string, userId: string): Promise<MemberDashboardData>;
```

Marcadas con `"server-only"` (siguiendo convención de `lib/tasks/queries.ts`). Las server pages (`app/admin/page.tsx`, `app/(app)/app/page.tsx`) leen `activeOrganizationId` y `userId` del session (igual que el resto del codebase) y llaman a la función correspondiente.

### Decisión 3: Bytes → MB en presentación, no en query

El query devuelve `storage_bytes` crudo. La conversión a MB ocurre en el componente UI con `Math.round((bytes / 1024 / 1024) * 10) / 10` (un decimal). Ventaja: la query queda agnóstica de presentación y testeable como número entero.

### Decisión 4: Tasa de cumplimiento — semántica del numerador

Definición elegida: numerador = tareas con `status = 'done' AND updated_at >= NOW() - 30d` (proxy de "completadas en la ventana"). Denominador = tareas con `created_at >= NOW() - 30d`.

**Alternativas consideradas:**
- Numerador y denominador sobre el mismo subconjunto (creadas en 30d que terminaron en done) → más estricta, pero no captura tareas viejas completadas en la ventana, lo que invisibiliza trabajo real.
- Cohort: tasa de las creadas en 30d que llegaron a done dentro de la ventana → la más rigurosa estadísticamente, pero confusa para el usuario final.

**Por qué la elegida:** es la lectura más natural ("cuántas terminamos en el último mes vs cuántas entraron") y se calcula con dos COUNT en el mismo CTE. Si denominador = 0, la UI muestra "Sin datos" sin dividir por cero.

**Limitación conocida:** la razón puede superar el 100% si en un mes se completan más tareas que las que entraron (porque vienen de meses anteriores). Esto es esperable y se documenta en el tooltip del KPI.

### Decisión 5: shadcn `chart` (recharts) para donut y barra de cumplimiento

shadcn provee un wrapper de recharts (`chart.tsx`) que ya respeta los tokens de tema. Si no está instalado, se agrega con MCP de shadcn o `npx shadcn@latest add chart`. Para `progress`, ídem.

**Alternativa:** SVG manual para el donut (sin recharts). Descartado: más código, peor accesibilidad por defecto, no aprovecha el wrapper ya tipado de shadcn.

### Decisión 6: Sin auto-refresh ni `revalidate`

Las pages son server components puros sin `export const revalidate`. Cada navegación o `F5` refresca. Esto cumple el pedido explícito del usuario y elimina cualquier carga sostenida a Postgres.

### Decisión 7: Layout responsivo con grid CSS

Mobile (default): stack vertical. `sm`/`md`: grid 2 columnas para KPIs. `lg`: grid de 4 columnas para KPIs y donut al lado del primer bloque. Top-5 columns: stack en mobile, dos columnas a partir de `md`.

Sin `useEffect` ni JS de medición — todo con clases Tailwind responsivas, alineado con el patrón ya usado en `tasks-route-shell.tsx`.

### Decisión 8: Click en top-5 — navegación nativa

`<Link>` de Next.js a `/admin/tasks/[id]` o `/tasks/[id]` según el rol. La página de detalle ya existe y respeta route protection.

## Risks / Trade-offs

- **[CTE complejo difícil de modificar]** → Mitigación: una sola fuente (`lib/dashboard/queries.ts`), tipado fuerte del row de salida, comentarios por CTE, tests de integración con seed de fixtures (pendientes en proyecto, no bloqueantes).
- **[Cálculo de cumplimiento puede exceder 100%]** → Mitigación: tooltip explicativo en el KPI; UI tope visual al 100% en barra, pero muestra el % real numérico.
- **[Sin `revalidate` significa que un admin que abre dashboard y deja la pestaña no ve cambios]** → Aceptado: requisito explícito del usuario. El usuario refresca con F5 cuando necesita data fresca.
- **[CTE `top_pending` con `LIMIT 5` requiere índice en `(organization_id, visibility, status, created_at DESC)` para rendir bien con miles de tareas]** → Mitigación: aceptable sin índice en v1 (volumen actual <1000 tareas/org); medir y agregar índice si EXPLAIN lo justifica más adelante. NO se incluye migración en esta change.
- **[Member query con OR + EXISTS puede no usar índice óptimo]** → Mitigación: igual que arriba; medir antes de optimizar. Patrón ya usado en `lib/tasks/queries.ts` para el listado de member.
- **[shadcn `chart` agrega recharts (~90KB gz)]** → Aceptado: el donut es central a la UX del dashboard y reusable en futuros dashboards. Se carga solo en estas dos rutas.
- **[Bytes calculados sumando todo `task_document` de la org]** → No incluye documentos huérfanos en R2 (sin fila en DB). Aceptado: el dashboard refleja el estado de la DB, no del bucket. Reconciliación R2↔DB queda fuera de scope.

## Migration Plan

- No hay migraciones de schema ni rollback de datos.
- Despliegue: merge → la próxima request a `/admin` o `/app` renderiza el dashboard nuevo. Sin feature flag.
- Rollback: revertir el commit y los stubs vuelven a su versión actual. Sin estado persistido a limpiar.

## Open Questions

- Ninguna bloqueante. El umbral exacto del top-5 de responsables (¿5? ¿10?) se fija en 5 por consistencia con el resto del dashboard.
