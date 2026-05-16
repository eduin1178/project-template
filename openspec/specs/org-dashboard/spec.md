# org-dashboard

## Purpose

Define el dashboard de la organización para Docentix, en dos vistas server-rendered: `/admin` para `owner`/`admin` con visión agregada de toda la organización, y `/app` para cualquier miembro autenticado con su scope personal de participación (responsable o assignee). Cubre KPIs operativos (estado de tareas, vencidas, próximas a vencer, tasa de cumplimiento 30 días, miembros, almacenamiento), top-5 de pendientes y en curso, distribución por responsable (solo admin), donut de estados, layout responsivo, optimización con una sola query agregada por dashboard y reglas de copy en español neutral.

## Requirements

### Requirement: Ruta de dashboard para admin/owner

El sistema SHALL renderizar en la ruta `/admin` un dashboard server-rendered exclusivo para usuarios con `member.role` igual a `admin` u `owner` en la `activeOrganizationId`. El dashboard SHALL reemplazar el contenido stub actual ("Panel de administración" / "en construcción") por las secciones de KPIs, gráficos y top-5 definidos en esta capability. El acceso por miembros regulares SHALL ser denegado según las reglas del capability `route-protection` ya vigentes para `/admin/*` y no se altera en esta change.

#### Scenario: Admin accede al dashboard
- **WHEN** un usuario con `member.role = "admin"` en la org activa navega a `/admin`
- **THEN** se renderiza el dashboard con todas las secciones (KPIs, donut, top-5 pendientes, top-5 en curso, distribución por responsable) en lugar del placeholder anterior

#### Scenario: Owner accede al dashboard
- **WHEN** un usuario con `member.role = "owner"` en la org activa navega a `/admin`
- **THEN** se renderiza el mismo dashboard, indistinguible del caso admin

#### Scenario: Member regular NO accede
- **WHEN** un `member` regular navega a `/admin`
- **THEN** se aplica la redirección/denegación ya definida en `route-protection` y el dashboard no se renderiza

### Requirement: Ruta de dashboard para miembros

El sistema SHALL renderizar en la ruta `/app` un dashboard server-rendered para cualquier usuario autenticado con `activeOrganizationId`, incluyendo `member`, `admin` y `owner`. El dashboard SHALL reemplazar el contenido stub actual ("Bienvenido a Docentix" / "en construcción") por las secciones definidas para vista de miembro. El scope de datos SHALL acotarse a las tareas en las que el usuario participa como responsable o assignee (definidos abajo); la autoría sola NO SHALL incluir tareas en el scope.

#### Scenario: Member accede al dashboard
- **WHEN** un `member` con organización activa navega a `/app`
- **THEN** se renderiza el dashboard personal con KPIs y top-5 acotados a su participación

#### Scenario: Admin también ve su dashboard personal
- **WHEN** un `admin` u `owner` navega a `/app`
- **THEN** se renderiza el dashboard personal con su scope individual; el dashboard de organización vive en `/admin`

#### Scenario: Usuario sin organización activa
- **WHEN** un usuario autenticado sin `activeOrganizationId` navega a `/app`
- **THEN** se aplica el flujo de selección/creación de organización ya definido y el dashboard no se renderiza

### Requirement: Definición operativa de "tarea vencida"

El sistema SHALL definir una tarea como "vencida" si y solo si cumple LAS TRES condiciones: `task.due_at IS NOT NULL`, `task.due_at < NOW()` en zona horaria del servidor, `task.status != 'done'` Y `task.visibility = 'active'`. Tareas en `draft` o `archived` NUNCA SHALL contarse como vencidas independientemente de su `due_at`. Tareas con `due_at = NULL` NUNCA SHALL contarse como vencidas.

#### Scenario: Tarea active con due_at pasado y status pending cuenta como vencida
- **WHEN** existe una tarea con `visibility='active'`, `status='pending'` y `due_at = NOW() - 1 hora`
- **THEN** se cuenta en el KPI de vencidas

#### Scenario: Tarea done con due_at pasado NO cuenta como vencida
- **WHEN** existe una tarea con `visibility='active'`, `status='done'` y `due_at = NOW() - 1 día`
- **THEN** NO se cuenta en el KPI de vencidas

#### Scenario: Tarea draft con due_at pasado NO cuenta como vencida
- **WHEN** existe una tarea con `visibility='draft'`, `status='pending'` y `due_at = NOW() - 1 día`
- **THEN** NO se cuenta en el KPI de vencidas

#### Scenario: Tarea archived NO cuenta como vencida
- **WHEN** existe una tarea con `visibility='archived'` y `due_at = NOW() - 1 día`
- **THEN** NO se cuenta en el KPI de vencidas

#### Scenario: Tarea sin due_at NO cuenta como vencida
- **WHEN** existe una tarea con `visibility='active'`, `status='pending'` y `due_at IS NULL`
- **THEN** NO se cuenta en el KPI de vencidas

### Requirement: Scope de tareas — admin/owner

El sistema SHALL incluir en TODAS las métricas del dashboard de `/admin` (KPIs de estado, vencidas, próximas a vencer, cumplimiento 30 días, top-5 pendientes, top-5 en curso, distribución por responsable) únicamente tareas con `task.organization_id = activeOrganizationId` del invocador. NO SHALL filtrar por autoría, responsabilidad ni participación: el scope admin abarca toda la organización.

#### Scenario: Admin ve tareas de toda la organización
- **WHEN** un admin abre el dashboard y existen tareas creadas por distintos autores en la org
- **THEN** todas se cuentan en los KPIs y aparecen en los top-5 según el orden definido, sin filtrar por `authorId`

#### Scenario: Admin NO ve tareas de otra organización
- **WHEN** un admin con `activeOrganizationId = A` abre el dashboard y existen tareas en organización B
- **THEN** las tareas de B NO se cuentan en ninguna métrica

### Requirement: Scope de tareas — miembro

El sistema SHALL incluir en TODAS las métricas del dashboard de `/app` únicamente tareas con `task.organization_id = activeOrganizationId` Y que cumplan: `task.responsible_id = userId` del invocador O EXISTS una fila en `task_assignee` con `task_id = task.id` y `user_id = userId`. La autoría (`authorId = userId`) por sí sola NO SHALL incluir la tarea en el scope.

#### Scenario: Tarea donde es responsable cuenta
- **WHEN** un member abre el dashboard y existe una tarea con `responsible_id = user.id` en la org activa
- **THEN** la tarea se incluye en los KPIs y puede aparecer en top-5 según orden

#### Scenario: Tarea donde es assignee cuenta
- **WHEN** un member abre el dashboard y existe una fila `task_assignee (task_id, user_id)` para una tarea en la org activa
- **THEN** la tarea se incluye en los KPIs y puede aparecer en top-5

#### Scenario: Tarea donde solo es autor NO cuenta
- **WHEN** un member abre el dashboard y existe una tarea con `author_id = user.id` pero `responsible_id != user.id` y sin fila en `task_assignee` para él
- **THEN** la tarea NO se incluye en ninguna métrica del dashboard del miembro

#### Scenario: Tarea donde es responsable Y assignee se cuenta una sola vez
- **WHEN** el scope detecta una tarea por ambos criterios simultáneamente (caso teórico)
- **THEN** la tarea se cuenta exactamente una vez en cada KPI (el query SHALL deduplicar)

### Requirement: KPI de tareas totales por estado

El sistema SHALL exponer en ambos dashboards tres contadores separados: `pending`, `in_progress`, `done`. Cada contador SHALL contar las tareas del scope (admin u member) que tengan `visibility = 'active'` y el `status` correspondiente. Las tareas con `visibility` en `draft` o `archived` NO SHALL contarse en estos KPIs.

#### Scenario: Conteo correcto con datos mixtos
- **WHEN** el scope contiene 3 tareas pending active, 2 in_progress active, 1 done active y 1 pending draft
- **THEN** los KPIs muestran `pending=3`, `in_progress=2`, `done=1`; el draft no entra

#### Scenario: Sin tareas activas en el scope
- **WHEN** el scope no tiene tareas active
- **THEN** los tres contadores muestran `0`

### Requirement: KPI de tareas vencidas sin terminar

El sistema SHALL exponer un contador único de vencidas según la definición operativa (`due_at < NOW() AND status != 'done' AND visibility = 'active'`), acotado al scope. Para admin = toda la org. Para member = solo tareas en su scope de participación. El KPI SHALL mostrarse con un indicador visual de alerta (ej. ícono o color de severidad) cuando es mayor a cero.

#### Scenario: Hay vencidas
- **WHEN** el scope tiene 2 tareas que cumplen la definición de vencida
- **THEN** el KPI muestra `2` con indicador visual de alerta

#### Scenario: Cero vencidas
- **WHEN** el scope no tiene vencidas
- **THEN** el KPI muestra `0` sin indicador de alerta

### Requirement: KPI de tareas que vencen en los próximos 7 días

El sistema SHALL exponer un contador de tareas con `due_at >= NOW() AND due_at < NOW() + INTERVAL '7 days' AND status != 'done' AND visibility = 'active'`, acotado al scope correspondiente. La ventana SHALL ser fija de 7 días, no configurable por el usuario.

#### Scenario: Tarea due_at en 3 días cuenta
- **WHEN** existe en el scope una tarea con `due_at = NOW() + 3 días`, `status='pending'`, `visibility='active'`
- **THEN** se incluye en el KPI

#### Scenario: Tarea ya vencida NO cuenta como próxima a vencer
- **WHEN** existe una tarea con `due_at = NOW() - 1 hora`, `status='pending'`, `visibility='active'`
- **THEN** se incluye en KPI de vencidas pero NO en próximas a vencer

#### Scenario: Tarea due_at más allá de 7 días NO cuenta
- **WHEN** existe una tarea con `due_at = NOW() + 8 días`
- **THEN** NO se incluye en este KPI

#### Scenario: Tarea done en ventana NO cuenta
- **WHEN** existe una tarea con `due_at = NOW() + 2 días` y `status='done'`
- **THEN** NO se incluye en este KPI

### Requirement: KPI de tasa de cumplimiento últimos 30 días

El sistema SHALL exponer una tasa calculada como `(count tareas del scope con status='done' AND updated_at >= NOW() - INTERVAL '30 days' AND visibility='active') / (count tareas del scope con created_at >= NOW() - INTERVAL '30 days' AND visibility='active')`. La ventana de 30 días SHALL ser fija. Si el denominador es `0`, el sistema SHALL mostrar la cadena "Sin datos" en lugar de un porcentaje. La tasa SHALL renderizarse como porcentaje redondeado al entero más cercano y SHALL acompañarse de una barra visual.

El sistema SHALL aceptar que la tasa puede exceder el 100% (porque el numerador puede incluir tareas creadas antes de la ventana pero completadas dentro de ella). La barra visual SHALL toparse al 100% pero el porcentaje numérico SHALL mostrar el valor real (ej. "115%").

#### Scenario: Cálculo con datos
- **WHEN** en los últimos 30 días se crearon 10 tareas active en el scope y se completaron 7 active en el scope (sin importar cuándo se crearon)
- **THEN** el KPI muestra `70%`

#### Scenario: Denominador cero
- **WHEN** en los últimos 30 días no se creó ninguna tarea active en el scope
- **THEN** el KPI muestra "Sin datos" en lugar de un porcentaje

#### Scenario: Tasa supera 100%
- **WHEN** en los últimos 30 días se crearon 5 tareas active y se completaron 6 active en el scope
- **THEN** el KPI muestra `120%` con la barra topada al 100% visualmente

### Requirement: KPI de cantidad de usuarios — solo admin/owner

El sistema SHALL exponer en el dashboard de `/admin` un contador `count(member WHERE organization_id = activeOrganizationId)`. Este KPI NO SHALL renderizarse en el dashboard de `/app`. El conteo SHALL incluir todos los roles (`owner`, `admin`, `member`).

#### Scenario: Conteo de miembros
- **WHEN** la organización tiene 1 owner, 2 admins y 5 members
- **THEN** el dashboard admin muestra `8` en el KPI de usuarios

#### Scenario: Member no ve este KPI
- **WHEN** un member abre `/app`
- **THEN** no existe un KPI de cantidad de usuarios en la página

### Requirement: KPI de uso total de almacenamiento

El sistema SHALL exponer un KPI de almacenamiento expresado en MB con un decimal de precisión.

- **Admin/owner**: SHALL calcular `sum(task_document.size_bytes)` para todas las filas de `task_document` cuya `task` asociada tenga `organization_id = activeOrganizationId`.
- **Member**: SHALL calcular `sum(task_document.size_bytes WHERE uploader_id = userId)`. NO SHALL filtrar por organización porque `uploader_id` ya es propio del usuario.

La conversión SHALL ser `bytes / 1024 / 1024` con un decimal (ej. "12.4 MB"). Si el total es `0`, SHALL mostrarse "0 MB".

#### Scenario: Admin ve total de organización
- **WHEN** la organización tiene tres documentos con `size_bytes` que suman 1572864 bytes (1.5 MB)
- **THEN** el dashboard admin muestra "1.5 MB"

#### Scenario: Member ve solo lo que subió
- **WHEN** un member subió un documento de 524288 bytes (0.5 MB) y otros miembros subieron 10 MB adicionales en la misma organización
- **THEN** el dashboard del member muestra "0.5 MB"

#### Scenario: Sin documentos
- **WHEN** no hay documentos en el scope
- **THEN** el KPI muestra "0 MB"

#### Scenario: Documentos huérfanos (uploader_id NULL) en admin
- **WHEN** la organización tiene un documento cuyo `uploader_id` quedó en NULL tras borrar el usuario
- **THEN** el documento se cuenta en el KPI admin (porque el JOIN es por `task_id → task.organization_id`)

### Requirement: Top 5 tareas pendientes más recientes

El sistema SHALL exponer una sección con hasta 5 tareas del scope que cumplan `status='pending' AND visibility='active'`, ordenadas por `created_at DESC`. Cada fila SHALL mostrar al menos `title` y `due_at` (formateado o ausente si es NULL) y SHALL ser un enlace navegable. El destino SHALL ser:
- `/admin/tasks/[id]` en el dashboard de `/admin`
- `/tasks/[id]` en el dashboard de `/app`

Si el scope tiene menos de 5 tareas pending, SHALL mostrar las que haya. Si no hay ninguna, SHALL mostrar un estado vacío con copy explicativo (ej. "No tienes tareas pendientes" / "No hay tareas pendientes en la organización").

#### Scenario: Hay más de 5 pending
- **WHEN** el scope tiene 8 tareas pending active
- **THEN** se muestran las 5 con `created_at` más reciente

#### Scenario: Click navega al detalle (admin)
- **WHEN** un admin hace click en una fila del top-5 pendientes en `/admin`
- **THEN** navega a `/admin/tasks/<id>` de esa tarea

#### Scenario: Click navega al detalle (member)
- **WHEN** un member hace click en una fila del top-5 pendientes en `/app`
- **THEN** navega a `/tasks/<id>` de esa tarea

#### Scenario: Sin pending
- **WHEN** el scope no tiene tareas pending active
- **THEN** la sección muestra el estado vacío con copy en español neutral

### Requirement: Top 5 tareas en curso recién actualizadas

El sistema SHALL exponer una sección con hasta 5 tareas del scope que cumplan `status='in_progress' AND visibility='active'`, ordenadas por `updated_at DESC`. Las reglas de presentación y navegación SHALL ser idénticas al top-5 pendientes (mismo enlace destino según rol, mismo estado vacío con copy adaptado).

#### Scenario: Orden por updated_at
- **WHEN** el scope tiene 3 tareas in_progress con `updated_at` distintos
- **THEN** se muestran ordenadas con la más recientemente actualizada arriba

#### Scenario: Sin in_progress
- **WHEN** el scope no tiene tareas in_progress active
- **THEN** la sección muestra el estado vacío

### Requirement: Distribución por responsable — solo admin/owner

El sistema SHALL exponer en el dashboard de `/admin` una sección con los responsables que tienen al menos una tarea abierta (`status IN ('pending', 'in_progress') AND visibility='active'`) en la organización, ordenados por cantidad de tareas abiertas descendente, limitado a top 5 responsables. Cada fila SHALL mostrar `nombre`, `email` (o avatar) y el conteo de tareas abiertas. Tareas sin `responsible_id` NO SHALL aparecer en esta sección (existen, pero no se atribuyen a nadie). Esta sección NO SHALL renderizarse en `/app`.

#### Scenario: Distribución con datos
- **WHEN** en la organización Ana tiene 4 tareas abiertas, Beto 2, Carla 1
- **THEN** la sección lista Ana(4), Beto(2), Carla(1) en ese orden

#### Scenario: Tareas sin responsable se excluyen
- **WHEN** la organización tiene 3 tareas abiertas sin `responsible_id`
- **THEN** esas tareas NO aparecen agregadas en la distribución (no se inventa un grupo "Sin asignar")

#### Scenario: Member no ve esta sección
- **WHEN** un member abre `/app`
- **THEN** no existe sección de distribución por responsable

#### Scenario: Sin tareas abiertas
- **WHEN** la organización no tiene tareas pending ni in_progress active
- **THEN** la sección muestra estado vacío con copy en español neutral

### Requirement: Donut chart de estados

El sistema SHALL renderizar en ambos dashboards un donut chart que visualiza la proporción entre `pending`, `in_progress` y `done` del KPI de tareas totales por estado. El chart SHALL respetar los tokens de tema de la app (colores semánticos para cada estado) y SHALL ser accesible (con labels textuales adyacentes o tooltips). Cuando el total es `0`, SHALL mostrar un placeholder vacío en lugar del donut.

#### Scenario: Donut con datos
- **WHEN** el KPI muestra 3 pending, 2 in_progress, 5 done
- **THEN** el donut renderiza tres segmentos proporcionales con labels y leyenda

#### Scenario: Donut sin datos
- **WHEN** los tres contadores son 0
- **THEN** el donut NO se renderiza; en su lugar aparece un estado vacío

### Requirement: Refresco solo por recarga del navegador

El sistema SHALL renderizar ambas páginas (`/admin` y `/app`) como server components puros sin `export const revalidate`, sin polling, sin auto-refresh, sin websockets y sin `setInterval` en el cliente. La data se recalcula únicamente cuando el navegador recarga la página o el usuario navega de regreso. El cache de Next.js SHALL aplicarse según los defaults del framework para la versión instalada (Next 16) sin configuración adicional.

#### Scenario: Sin auto-refresh
- **WHEN** un usuario abre `/admin` y deja la pestaña abierta sin interactuar
- **THEN** los KPIs NO se actualizan solos; siguen mostrando el snapshot del render inicial

#### Scenario: Recarga refresca data
- **WHEN** un usuario presiona F5 en `/admin` o `/app`
- **THEN** la data se recalcula desde Postgres y la UI refleja los valores actuales

### Requirement: Optimización con query agregada única

El sistema SHALL calcular todos los KPIs, top-5 y distribución de cada dashboard mediante UNA sola query agregada a Postgres por dashboard (admin u member), construida con CTEs. NO SHALL ejecutar una query por sección. Las queries SHALL vivir en un módulo `lib/dashboard/queries.ts` marcado con `"server-only"` y SHALL exponer dos funciones puras: `getAdminDashboard(orgId)` y `getMemberDashboard(orgId, userId)`. Las funciones SHALL devolver objetos tipados que cubran todas las secciones del dashboard.

#### Scenario: Admin dashboard hace una sola query
- **WHEN** se renderiza `/admin`
- **THEN** `getAdminDashboard(orgId)` ejecuta exactamente UN statement SQL contra Postgres y devuelve todos los datos del dashboard en un solo objeto

#### Scenario: Member dashboard hace una sola query
- **WHEN** se renderiza `/app` para un member con organización activa
- **THEN** `getMemberDashboard(orgId, userId)` ejecuta exactamente UN statement SQL y devuelve todos los datos del dashboard del miembro

### Requirement: Layout responsivo

El sistema SHALL renderizar el dashboard con un layout que se adapte al ancho del viewport sin depender de JS de medición:

- **Mobile (`< md`, <768px)**: las secciones SHALL apilarse verticalmente en una sola columna.
- **Tablet (`md` y mayor, ≥768px)**: los KPIs SHALL renderizarse en una grilla de 2 columnas; los top-5 SHALL ocupar una columna cada uno.
- **Desktop (`lg` y mayor, ≥1024px)**: los KPIs SHALL renderizarse en una grilla de 3 o 4 columnas según rol (admin tiene más KPIs que member), con el donut al lado del bloque de KPIs.

La adaptación SHALL hacerse con clases responsivas de Tailwind, sin `useEffect` ni `window.matchMedia`.

#### Scenario: Mobile apila secciones
- **WHEN** un usuario abre el dashboard en un viewport <768px
- **THEN** todas las secciones aparecen apiladas en una sola columna en orden vertical

#### Scenario: Desktop muestra grilla de KPIs
- **WHEN** un usuario abre el dashboard en un viewport ≥1024px
- **THEN** los KPIs aparecen en grilla horizontal junto con el donut

### Requirement: Componentes shadcn-ui

El sistema SHALL implementar la UI del dashboard usando componentes de `components/ui/` (shadcn) ya instalados (Card, Badge, Avatar, Separator, Skeleton, Button) más los componentes nuevos `chart` (wrapper de recharts) y `progress` si no están presentes. Los nuevos componentes SHALL agregarse vía el MCP de shadcn o `npx shadcn@latest add <name>` antes o durante la implementación. Las composiciones específicas del dashboard (KPI card, donut, lista top-5) SHALL vivir en `next-app/components/dashboard/` y NO en `components/ui/`.

Los iconos SHALL provenir de `@phosphor-icons/react`. NO SHALL introducirse `lucide-react` ni otro set de iconos.

#### Scenario: Composiciones en components/dashboard
- **WHEN** se inspecciona la estructura del repo tras la implementación
- **THEN** los componentes específicos del dashboard viven en `next-app/components/dashboard/` y los componentes primitivos en `next-app/components/ui/`

#### Scenario: shadcn chart agregado si falta
- **WHEN** al iniciar la implementación se verifica que `components/ui/chart.tsx` no existe
- **THEN** se agrega vía MCP de shadcn o CLI antes de implementar el donut

### Requirement: Copy en español neutral

El sistema SHALL usar español neutral en segunda persona singular `tú` en TODO el copy visible del dashboard (títulos de sección, labels de KPIs, tooltips, estados vacíos, mensajes de error). NO SHALL usar voseo (`Ingresá`, `Seleccioná`, `vos`, `tenés`, `querés`, etc.), ni regionalismos.

#### Scenario: Copy del dashboard
- **WHEN** se inspecciona cualquier texto visible en `/admin` o `/app`
- **THEN** las cadenas usan formas neutras (`tú`, "Tienes", "Selecciona", "Tareas pendientes", "Sin datos", "No tienes tareas vencidas") y NO contienen voseo
