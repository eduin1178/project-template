## 1. Componentes shadcn faltantes

- [x] 1.1 Verificar si `components/ui/chart.tsx` y `components/ui/progress.tsx` existen
- [x] 1.2 Si faltan, agregarlos vía MCP de shadcn (`mcp__shadcn__*`) o `npx shadcn@latest add chart progress`
- [x] 1.3 Confirmar que `recharts` quedó instalado como dependencia tras agregar `chart`

## 2. Tipos y módulo de queries

- [x] 2.1 Crear `next-app/lib/dashboard/queries.ts` con cabecera `import "server-only"`
- [x] 2.2 Definir tipos exportados `AdminDashboardData` y `MemberDashboardData` cubriendo: `pending`, `inProgress`, `done`, `overdue`, `dueSoon`, `completion30d` (`{ done: number; created: number }`), `topPending: TopTaskRow[]`, `topInProgress: TopTaskRow[]`, `storageBytes: number`, y para admin además `memberTotal: number`, `byResponsible: ResponsibleRow[]`
- [x] 2.3 Implementar `getAdminDashboard(orgId: string): Promise<AdminDashboardData>` con un solo `db.execute(sql\`...\`)` que use los CTEs definidos en `design.md` (status_counts, window_30d, top_pending, top_in_progress, by_responsible, member_count, storage)
- [x] 2.4 Implementar `getMemberDashboard(orgId: string, userId: string): Promise<MemberDashboardData>` con la variante que filtra `active_tasks` por `responsible_id = $2 OR EXISTS task_assignee`, omite `by_responsible` y `member_count`, y reemplaza `storage` por `sum(size_bytes) WHERE uploader_id = $2`
- [x] 2.5 Parsear los `json_agg` resultantes a arrays tipados; manejar el caso `NULL` (sin filas) devolviendo `[]`

## 3. Componentes UI del dashboard

- [x] 3.1 Crear directorio `next-app/components/dashboard/`
- [x] 3.2 `kpi-card.tsx`: card con título, valor grande, ícono Phosphor opcional, variante de severidad (default/alert) para el caso de vencidas > 0
- [x] 3.3 `status-donut.tsx`: usa shadcn `chart` (recharts) para renderizar donut con segmentos pending/in_progress/done; tokens de tema; estado vacío cuando total = 0
- [x] 3.4 `completion-bar.tsx`: barra de progreso usando shadcn `progress` topada visualmente al 100% pero mostrando el % real (incluyendo >100%); muestra "Sin datos" si denominador = 0
- [x] 3.5 `top-tasks-list.tsx`: lista de filas con `title`, `dueAt` formateado y `Link` al detalle. Recibe prop `hrefBuilder: (id) => string` para diferenciar admin (`/admin/tasks/[id]`) vs member (`/tasks/[id]`); estado vacío con copy parametrizable
- [x] 3.6 `responsible-distribution.tsx`: lista de avatars + nombre + email + conteo de tareas abiertas; estado vacío
- [x] 3.7 `storage-card.tsx`: KPI especializado que convierte `bytes` → MB con un decimal y muestra "0 MB" si es 0
- [x] 3.8 Todos los componentes usan copy en español neutral (`tú`, "Tienes", "Tareas pendientes", "Sin datos", "No tienes tareas en curso", etc.)

## 4. Página de dashboard admin

- [x] 4.1 Reemplazar `next-app/app/admin/page.tsx` para que sea un server component que obtenga `session` (con `activeOrganizationId`) y llame a `getAdminDashboard(orgId)`
- [x] 4.2 Renderizar layout: header con saludo y nombre de org; grilla de KPI cards (pending, in_progress, done, overdue, due_soon, members, storage); donut al lado del primer bloque; barra de cumplimiento; dos columnas con top-5 pendientes y top-5 en curso; sección de distribución por responsable abajo
- [x] 4.3 Aplicar grid responsivo: stack en mobile, 2 cols en `md`, 3-4 cols en `lg`
- [x] 4.4 Sin `export const revalidate`; sin polling; sin `setInterval` en cliente
- [x] 4.5 Actualizar `metadata.title` a "Panel — Docentix" o similar

## 5. Página de dashboard miembro

- [x] 5.1 Reemplazar `next-app/app/(app)/app/page.tsx` para que sea un server component que obtenga `session` y llame a `getMemberDashboard(orgId, userId)`
- [x] 5.2 Renderizar layout análogo pero SIN KPI de usuarios, SIN distribución por responsable; mismos top-5 con `hrefBuilder` apuntando a `/tasks/[id]`
- [x] 5.3 Aplicar mismo grid responsivo
- [x] 5.4 Sin `revalidate`, sin polling
- [x] 5.5 Actualizar `metadata.title` a "Inicio — Docentix" o similar

## 6. Estados vacíos y bordes

- [x] 6.1 Cuando el dashboard admin no tiene tareas active en la org: KPIs muestran 0, donut estado vacío, top-5 muestran copy "No hay tareas..." y distribución muestra "Aún no hay tareas asignadas a un responsable"
- [x] 6.2 Cuando el member no tiene tareas en su scope: análogo con copy de primera persona "Aún no tienes tareas asignadas"
- [x] 6.3 Tasa de cumplimiento con denominador 0: render "Sin datos" en lugar de "0%"
- [x] 6.4 Tasa > 100%: render del % real con barra topada al 100%

## 7. Verificación manual

- [x] 7.1 Loguearse como owner en una org con varias tareas: confirmar que `/admin` muestra toda la org
- [x] 7.2 Loguearse como member sin ser responsable ni assignee de nada: confirmar que `/app` muestra estados vacíos consistentes y NO muestra tareas que solo creó
- [x] 7.3 Loguearse como member responsable de 1 tarea y assignee de otra: confirmar que ambas aparecen en KPIs y top-5 sin duplicar
- [x] 7.4 Verificar copy en español neutral (sin voseo) en todas las cadenas visibles
- [x] 7.5 Verificar responsive: mobile (<768px), tablet (768-1023px), desktop (≥1024px)
- [x] 7.6 Verificar que recarga del navegador refresca los datos y que dejar la pestaña abierta NO los actualiza solo
- [x] 7.7 Verificar que click en una fila del top-5 navega a `/admin/tasks/[id]` (admin) o `/tasks/[id]` (member)
- [x] 7.8 Confirmar con un cliente de DB que cada render de dashboard ejecuta exactamente 1 query agregada (no N queries)
