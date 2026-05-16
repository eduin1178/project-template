## Context

La bandeja de tareas (`/tasks` y `/admin/tasks`) hoy se renderiza con un layout fijo de tres columnas:

```
[ aside w-64 hidden md:block ] [ section max-w-110 ] [ section hidden lg:flex ]
        filtros                       lista                    detalle
```

La selección de tarea se mantiene en `?taskId=<id>` y el detalle se renderiza en la tercera `<section>`. El problema crítico es que `<section hidden lg:flex>` significa que en pantallas <1024px **el detalle nunca se muestra**, aunque la URL cambie. Funcionalmente roto en mobile y tablet.

Otras restricciones del estado actual:
- Las queries (`listTasks`, `listTasksForMember`, `listOrgMembers`, `attachAssignees`) NO traen `user.image`, así que los avatares solo pueden mostrar iniciales aunque la columna ya exista en `user.image` ([lib/db/schema/auth.ts:16](next-app/lib/db/schema/auth.ts#L16)).
- El primitivo `<Avatar>` ya soporta `<AvatarImage>` ([components/ui/avatar.tsx:28](next-app/components/ui/avatar.tsx#L28)) — falta cablearlo y traer el dato.
- El `<Sheet>` de shadcn ya está instalado en `components/ui/sheet.tsx`; no hay que agregar dependencia.
- El spec previo (`task-assignments` → "Ruta `/tasks` para vista de participación") **explícitamente requería** `?taskId=` y un redirect 308 desde `/tasks/[taskId]` HACIA el query param. Esta change invierte ese contrato (la spec se modifica para reflejarlo) y queda como ADR de facto.

Convenciones del proyecto que esta change debe respetar (ver `next-app/AGENTS.md`):
- Next.js 16, React 19. Cuando toquemos APIs de routing verificamos en `node_modules/next/dist/docs/`.
- shadcn-first; nada de lucide; iconos Phosphor.
- Copy en español neutral con `tú`, sin voseo.

## Goals / Non-Goals

**Goals:**

- `/tasks` y `/admin/tasks` usables en mobile y tablet con un patrón "stack de pantallas" (lista ↔ detalle), sin perder el layout three-pane que ya funciona en desktop.
- Detalle de tarea como ruta canónica (`/tasks/[taskId]` y `/admin/tasks/[taskId]`), deep-linkable, server-rendered, y con redirect 308 desde el query param legacy `?taskId=` para no romper bookmarks.
- Filtros accesibles en mobile vía `Sheet` lateral; preserva semántica idéntica al panel desktop.
- Avatares con foto real desde `user.image` con fallback automático a iniciales — sin nuevas dependencias, sin tocar el schema de auth.
- Email visible debajo del nombre en la lista de assignees del modal y en los `<Select>` de personas, para resolver el caso real de usuarios homónimos en una organización.

**Non-Goals:**

- NO se introduce mobile-first global ni se reescriben otras vistas (`/admin`, `/app`, comentarios standalone, etc.). Esta change está scoped al shell de tareas.
- NO se rediseña la cabecera del detalle ni se reorganizan los botones de acciones (descartado en exploración: hilo "Mover botones" se canceló).
- NO se introduce subida ni recorte de fotos de usuario; se consume `user.image` tal cual lo expone Better Auth.
- NO se cambia el contrato de capabilities, de server actions ni de invariantes de dominio.
- NO se añaden tests E2E nuevos en este cambio (el repo no tiene Playwright configurado todavía); se valida con verificación de tipos, linter y prueba manual.
- NO se introduce parallel routes con slots `@list`/`@detail`. Ver decisión 1 abajo: descartado por simplicidad.

## Decisions

### 1. Routing: subruta `[taskId]` con layout compartido — sin parallel routes

**Decisión:** Estructurar las rutas así:

```
app/(app)/tasks/
├── layout.tsx          ← layout compartido (filtros + slot lista + slot detalle responsivos)
├── page.tsx            ← server component: lista (sin tarea seleccionada)
└── [taskId]/
    └── page.tsx        ← server component: lista + detalle (con tarea seleccionada)

app/admin/tasks/
├── layout.tsx          ← análogo
├── page.tsx            ← lista (admin)
└── [taskId]/
    └── page.tsx        ← lista + detalle (admin)
```

El `layout.tsx` define el shell visual (`flex` con altura calculada). `page.tsx` y `[taskId]/page.tsx` ambos renderizan la lista (es server-side, baja toda); `[taskId]/page.tsx` además renderiza el `<TaskDetailPane>`. Las clases responsivas en el layout deciden qué se ve:

```tsx
// layout.tsx (esqueleto)
<div className="flex h-[calc(100vh-4rem)]">
  <FiltersAside className="hidden md:block w-64" />
  <div className="flex flex-1 min-w-0">
    {/* children = page.tsx o [taskId]/page.tsx */}
    {children}
  </div>
</div>
```

```tsx
// [taskId]/page.tsx (esqueleto)
<>
  {/* lista oculta en mobile cuando hay taskId */}
  <ListPanel className="hidden lg:flex w-110 shrink-0" />
  <DetailPane className="flex flex-1" />
</>
```

```tsx
// page.tsx (sin taskId)
<ListPanel className="flex flex-1 lg:max-w-110" />
{/* En lg+ además renderizamos un EmptyState al lado */}
<DetailEmptyState className="hidden lg:flex flex-1" />
```

**Alternativas consideradas:**

- **Parallel routes (`@list` + `@detail`).** Más elegante en papel y nominalmente cierra el círculo "ruta = estado del UI". Descartada por:
  - Mayor curva: `default.tsx` por slot, manejo de loading/error multiplicado, comportamiento poco intuitivo en `revalidatePath`.
  - Doble fetch del mismo conjunto de datos cuando la lista debe filtrarse igual en ambos slots: requiere caché compartida o duplicación.
  - Para nuestro caso (lista + detalle del mismo recurso) un layout compartido + segmento opcional resuelve lo mismo con menos piezas móviles y sin renunciar al deep-link ni al server-render.
- **Mantener `?taskId=` y mostrar/ocultar con CSS responsive.** Lo más barato pero deja la ruta sucia, no es deep-linkable de forma natural y no nos prepara para futuras vistas mobile-only (la propuesta del usuario menciona "tener una aplicación móvil pronto").
- **Routing client-side (state push en el cliente).** Más rápido de implementar pero rompe el server-rendering y obliga a duplicar capability checks en el cliente.

**Trade-off aceptado:** las dos páginas (`page.tsx` y `[taskId]/page.tsx`) duplican la lógica de fetching de la lista (≈30 líneas). Aceptamos la duplicación porque (a) la lógica está en una helper server-side reutilizable, (b) la duplicación es lineal con el número de rutas (2 en /tasks, 2 en /admin/tasks, total 4), no escala mal.

### 2. Decisión de "una sola sección a la vez" en mobile = CSS responsive, no JS

**Decisión:** Las clases `hidden lg:flex` (en la lista cuando hay `[taskId]`) y `hidden lg:flex` (en el detalle cuando NO hay `[taskId]`) deciden qué se muestra. No usamos `useMediaQuery` ni hooks client-side.

Esto significa:
- Server-render en mobile entrega solo el HTML necesario (ahorra payload).
- El SSR funciona idéntico en cualquier viewport sin hidration mismatch.
- El "botón Volver a la lista" navega a `/tasks` (o `/admin/tasks`) preservando searchParams: una navegación normal de Next.js, no un `setState`.

**Alternativa descartada:** `useMediaQuery` + `<Sheet>` para el detalle. Más interactivo pero introduce flicker en deep-links mobile y complica el state-management.

### 3. Redirect del query param legacy

**Decisión:** En cada `page.tsx` (la raíz de `/tasks` y `/admin/tasks`), antes de cualquier otro trabajo, leer `searchParams.taskId`. Si está presente y es `string` no vacío, llamar `redirect(\`/tasks/${taskId}?...\`)` preservando los demás searchParams. `redirect()` de Next responde 307 por default; usamos la variante con statusCode para 308 (RFC: 308 mantiene el método HTTP, semánticamente correcto para una "ruta movida").

```ts
import { permanentRedirect } from "next/navigation";

if (typeof params.taskId === "string" && params.taskId.length > 0) {
  const rest = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k === "taskId") continue;
    if (typeof v === "string") rest.set(k, v);
    else if (Array.isArray(v)) for (const x of v) rest.append(k, x);
  }
  const qs = rest.toString();
  permanentRedirect(`/tasks/${params.taskId}${qs ? `?${qs}` : ""}`);
}
```

`permanentRedirect` emite 308. Verificar la API exacta en `node_modules/next/dist/docs/` antes de implementar (Next 16 puede haber cambiado el helper).

### 4. Filtros mobile = `<Sheet>` con submit inmediato

**Decisión:** En el layout, renderizar dos versiones del panel de filtros:

- `<aside className="hidden md:block w-64">` con `<TasksFiltersPanel>` (igual que hoy).
- `<div className="md:hidden">` con un botón `<Button variant="outline">[Filtros (N)]</Button>` que abre un `<Sheet side="left">` cuyo contenido es el mismo `<TasksFiltersPanel>`.

El conteo `N` se calcula server-side comparando los searchParams contra el default. El `<Sheet>` se cierra automáticamente cuando el `<TasksFiltersPanel>` actualiza la URL (Next refresca y el componente se re-renderiza con `open=false` controlado por una prop derivada de la URL). Si esa propagación no funciona limpia, mantenemos `open` como state local y cerramos en el `onValueChange` interno.

**Alternativa descartada:** `<Drawer>` (variante mobile de shadcn con animación bottom-up). Más nativo en mobile pero menos consistente con los `<Sheet>` ya usados en otras partes (verificar). Mantenemos `<Sheet side="left">` por consistencia.

### 5. Foto de usuario: extender queries existentes con `user.image`

**Decisión:** Agregar `image` a las queries de tareas vía `LEFT JOIN` adicional sobre `user`. Concretamente:

- En `TASK_SELECT_SHAPE` ([lib/tasks/queries.ts:61-76](next-app/lib/tasks/queries.ts#L61-L76)) agregar `authorImage: authorUser.image` y `responsibleImage: responsibleUser.image`.
- En `attachAssignees` ([lib/tasks/queries.ts:78-99](next-app/lib/tasks/queries.ts#L78-L99)) agregar `image: user.image` al select.
- En `TaskListItem`, `TaskAssigneeItem`, `TaskRow`, `normalizeRow` ([lib/tasks/queries.ts:35-118](next-app/lib/tasks/queries.ts#L35-L118)) agregar el campo `string | null`.
- En `OrgMemberOption` y `listOrgMembers` (≈ línea 304) agregar `image`.

El `<Avatar>` consume el dato así:

```tsx
<Avatar className="size-7">
  {user.image ? <AvatarImage src={user.image} alt={personLabel(user.name, user.email)} /> : null}
  <AvatarFallback>{personInitials(user.name, user.email)}</AvatarFallback>
</Avatar>
```

`<AvatarImage>` de Radix maneja el fallback automáticamente cuando la carga falla; el `<AvatarFallback>` cubre tanto "no hay image" como "image rota". El `null` explícito en `image=null` evita un `<img src="">` (que algunos browsers interpretan como request a la página actual).

### 6. Componente `PersonOptionItem` reusable para `<Select>` de dos líneas

**Decisión:** Extraer un pequeño componente presentacional para el item de dos líneas (nombre + email), usado tanto en el dropdown de "Responsable" como en "Agregar al equipo de apoyo":

```tsx
// components/tasks/person-option-item.tsx (esqueleto)
export function PersonOptionItem({ name, email }: { name: string | null; email: string | null }) {
  const primary = name?.trim() || email?.trim() || "Sin nombre";
  const secondary = name?.trim() && email?.trim() ? email.trim() : null;
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-sm">{primary}</span>
      {secondary ? (
        <span className="text-muted-foreground text-xs">{secondary}</span>
      ) : null}
    </div>
  );
}
```

Se renderiza dentro de `<SelectItem>`. El `<SelectValue>` del trigger sigue mostrando el `personLabel` (solo nombre) — comportamiento por default de Radix Select que toma el `textValue` del item; debemos pasar `textValue={personLabel(...)}` explícito al `<SelectItem>` para que el trigger muestre solo el nombre cuando hay selección, no el item completo.

### 7. Botón "Volver a la lista" mobile

**Decisión:** En `[taskId]/page.tsx` (no en `task-detail-pane.tsx`), renderizar un botón visible solo en mobile arriba del `<TaskDetailPane>`:

```tsx
<div className="lg:hidden border-b px-4 py-2">
  <Button asChild variant="ghost" size="sm">
    <Link href={{ pathname: "/tasks", query: filtersFromSearchParams }}>
      <ArrowLeftIcon /> Volver a la lista
    </Link>
  </Button>
</div>
<TaskDetailPane ... />
```

Evitamos modificar `<TaskDetailPane>` para esta UI específica de routing. El componente sigue siendo agnóstico al lugar donde se monta.

## Risks / Trade-offs

- **Riesgo:** Duplicación de fetching entre `page.tsx` y `[taskId]/page.tsx` (lista) puede divergir con el tiempo. → **Mitigación:** Extraer un helper server-side `loadTasksForRoute({ ctx, searchParams })` que ambos `page.tsx` consuman. Los dos pages quedan delgados.
- **Riesgo:** El `<Sheet>` de filtros mobile no cierra automáticamente al aplicar un filtro si la prop `open` no se sincroniza con la navegación. → **Mitigación:** Usar `open` controlado, escuchar el `onValueChange` interno del `<TasksFiltersPanel>` (o emitir un callback `onAfterApply`) para cerrar manualmente.
- **Riesgo:** Imágenes externas (URL en `user.image`) pueden ser de dominios no permitidos por la config de Next Image. → **Mitigación:** Usamos `<img>` plano dentro de Radix `<AvatarImage>`, no `<Image>` de Next. No requiere whitelist.
- **Riesgo:** `permanentRedirect` desde `page.tsx` puede no preservar correctamente arrays en searchParams si los serializamos mal. → **Mitigación:** Pruebas manuales con `?taskId=X&status=in_progress&status=pending` antes de mergear.
- **Riesgo:** El usuario puede tener un PR/feature paralela tocando los mismos archivos del shell de tareas. → **Mitigación:** Confirmar antes de implementar; el repo está en branch `dev` con cambios sin commitear, hay riesgo de conflicto con trabajo en progreso. **Decisión a confirmar con el usuario antes de aplicar.**
- **Trade-off aceptado:** El email en `<SelectItem>` aumenta la altura del dropdown ~20px por opción. En orgs con muchos miembros la lista se vuelve más larga visualmente. Aceptable: la mejora de discriminación supera el costo.
- **Trade-off aceptado:** En desktop con tarea seleccionada, la lista sigue ocupando 440px (`max-w-110`) y el detalle el resto. No optimizamos densidades; mantenemos el layout familiar.

## Migration Plan

1. **No DB migration.** Esta change no toca el schema; consume `user.image` que ya existe.
2. **Order of changes en código:**
   1. Extender queries (`queries.ts`) con `image` en todos los puntos. Tipos y normalización.
   2. Renderizar `<AvatarImage>` en componentes. (Cambio aislado: si algo falla, los avatares se ven con iniciales — degradación segura.)
   3. Extender `OrgMemberOption` con `image` y `email` ya presente — agregar `<PersonOptionItem>` en assignees-panel y selects.
   4. Crear `layout.tsx` para `/tasks` y `/admin/tasks`. Mover el shell visual desde `page.tsx` al layout. `page.tsx` queda como solo-lista.
   5. Crear `[taskId]/page.tsx` que reusa el server fetching y monta `<TaskDetailPane>`.
   6. Actualizar `<TasksListPanel>` para que los `<Link>` apunten a `/tasks/<id>` y `/admin/tasks/<id>` en vez de `?taskId=<id>`.
   7. Agregar el redirect 308 de `?taskId=` en `page.tsx`.
   8. Agregar el `<Sheet>` mobile para filtros y el botón "Volver" en `[taskId]/page.tsx`.
3. **Rollback:** Cada paso es reversible. Si el routing de parallel falla en producción, basta con revertir el commit que crea `[taskId]/page.tsx` y restaurar el `?taskId=` reading. El cambio de avatares es independiente y sobrevive el rollback de routing.

## Open Questions

- ¿Hay trabajo en progreso (uncommitted changes en `next-app/app/(app)/tasks/page.tsx`, `next-app/app/admin/tasks/page.tsx` y otros archivos del shell de tareas según `git status` al inicio de la sesión) que pueda colisionar con esta change? Confirmar antes de implementar para coordinar el orden de aplicación.
- ¿Queremos prefetch del detalle al hacer hover en una fila de la lista (UX premium en desktop)? Probablemente no en este cambio; lo registramos como mejora futura.
- ¿El `<TaskDetailPane>` necesita un breadcrumb interno cuando se monta como página standalone en mobile (ejemplo: "Mis tareas > Tarea X")? Por ahora con el botón "Volver" alcanza; lo dejamos como mejora futura.
