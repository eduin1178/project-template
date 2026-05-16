## Why

Las rutas `/admin` y `/app` actualmente son stubs ("en construcción") que dejan sin punto de aterrizaje útil a admin/owners y miembros tras autenticarse. Sin un dashboard, los usuarios deben navegar a `/admin/tasks` o `/tasks` solo para entender el estado de su trabajo, y los admins no tienen visión agregada de la salud operativa de la organización (vencidas, carga por responsable, uso de almacenamiento, cumplimiento). Este cambio introduce un dashboard server-rendered con KPIs accionables y atajos a las tareas más relevantes, diferenciando lo que ve un administrador (toda la organización) de lo que ve un miembro (solo las tareas en las que participa).

## What Changes

- Reemplazar el stub de `app/admin/page.tsx` por un dashboard de organización con KPIs, donut de estados, top-5 pendientes, top-5 en curso y distribución por responsable.
- Reemplazar el stub de `app/(app)/app/page.tsx` por un dashboard personal con los mismos KPIs y top-5 acotados al scope de participación del miembro (responsable o assignee), sin métricas de organización (conteo de usuarios, distribución por responsable).
- Agregar módulo `lib/dashboard/queries.ts` con queries agregadas server-side. Una sola pasada a Postgres por dashboard (CTEs consolidados) más `Promise.all` para lo que no consolide, optimizando UX.
- Definir reglas operativas explícitas: "vencida" = `dueAt < NOW() AND status != 'done' AND visibility = 'active'`; KPIs por estado y top-5 solo sobre `visibility = 'active'`; scope member = `responsibleId = me OR EXISTS task_assignee`.
- Storage: admin ve `sum(sizeBytes)` de la org en MB; miembro ve solo lo subido por sí mismo (`uploaderId = me`) en MB.
- Tasa de cumplimiento últimas 30 días: `done en últimos 30 días / total creadas en últimos 30 días` (visibility='active'). Denominador 0 → "Sin datos".
- Top-5 pendientes (createdAt DESC) y top-5 en curso (updatedAt DESC). Click navega a `/admin/tasks/[id]` o `/tasks/[id]` según el rol.
- Refresco: solo en recarga del navegador. Sin auto-refresh, sin `revalidate` corto, sin polling.
- UI con componentes shadcn existentes en `components/ui/` más `chart` (recharts wrapper) y `progress` si no están instalados; agregar vía MCP de shadcn o registry. Copy en español neutral (`tú`). Iconos `@phosphor-icons/react`.
- Responsive: grid en desktop, stack en mobile.

## Capabilities

### New Capabilities
- `org-dashboard`: dashboard agregado por rol (admin/owner y member) sobre tareas y almacenamiento de la organización activa, con KPIs, top-5 y visualizaciones. Define rutas, queries server-side, reglas de scope, y composición de UI.

### Modified Capabilities
<!-- Ninguna. Las reglas de dominio (visibility, status, scope member, expiración, sizeBytes) ya están fijadas en tasks-core, task-assignments y task-documents; este cambio las consume sin alterarlas. -->

## Impact

- **Código nuevo**:
  - `next-app/lib/dashboard/queries.ts` — módulo server-only con las queries agregadas (admin y member).
  - `next-app/components/dashboard/` — componentes de presentación (KPI cards, donut, top-5 list, distribución por responsable, progreso de cumplimiento).
- **Código modificado**:
  - `next-app/app/admin/page.tsx` — reemplaza stub por dashboard admin.
  - `next-app/app/(app)/app/page.tsx` — reemplaza stub por dashboard member.
- **Dependencias**:
  - Posible alta de `recharts` (transitivo vía shadcn `chart` registry) si no está.
  - Posible alta de primitivas shadcn `chart` y `progress` en `components/ui/`.
- **APIs/DB**: ninguna migración. Reutiliza esquema actual (`task`, `task_assignee`, `task_document`, `member`).
- **Sin impacto en**: auth, route protection (`/admin/*` ya protegido), specs existentes (no se modifican).
- **Performance**: una consulta agregada por render evita N+1; sin auto-refresh evita carga sostenida en DB.
