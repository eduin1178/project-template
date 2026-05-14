## Context

`add-tasks-inbox-and-admin-edit` (archivado) dejó el detail pane unificado entre `/admin/tasks` y `/tasks` con un placeholder visual (`task-comments-placeholder.tsx`) al pie del panel: un `<Textarea>` deshabilitado con label "Responde a {autor}…" y la nota "Los comentarios llegan en una próxima entrega". Este cambio rellena ese hueco.

Estado actual relevante:

- Schema en `next-app/lib/db/schema/task.ts` define `task` y `task_assignee`. Sin tabla de comentarios.
- Queries en `next-app/lib/tasks/queries.ts` exponen `TaskListItem` con autor, responsable, assignees, pero NO comentarios. El detail pane consume `TaskListItem`.
- Server actions en `next-app/lib/tasks/actions.ts` (createTask, updateTaskContent, transitionVisibility, transitionStatus, setResponsible, clearResponsible, addAssignee, removeAssignee, claimAuthorship, deleteTask). Patrón: `"use server"`, retorno `ActionResult<T>`, autorización vía `requireOrgAdmin` / `requireOrgMember` / chequeo `isOrgAdmin`, `revalidatePath` sobre `/admin/tasks` y `/tasks`.
- Capabilities en `next-app/lib/tasks/capabilities.ts`: tipo `TaskCapabilities` con 8 flags + `computeCapabilities({ task, viewer })`. Hoy NO incluye `canComment`.
- UI compartida bajo `next-app/components/tasks/`: shell (`tasks-filters-panel`, `tasks-list-panel`, `task-detail-pane`), acciones (`task-detail-actions`, `task-row-actions`), team (`task-assignees-panel`, `task-team-summary`), dialogs (`create-task-dialog`, `edit-task-dialog`), card (`task-card`), placeholder (`task-comments-placeholder`).
- Stack: Next 16.2.6 server actions, Drizzle ORM, shadcn-first sobre `components/ui/`, Phosphor Icons, `react-hook-form` + `zod`, Tailwind 4.

Constraints:

- Copy en español neutral con `tú`, sin voseo.
- shadcn-first en UI; nada de re-implementar primitivas.
- Plain text en `body` (sin markdown/HTML).
- Identidad del viewer no viaja al cliente; el server precalcula `canDelete` por fila.

## Goals / Non-Goals

**Goals:**

- Permitir conversación inline tipo chat al pie del detail pane, visible a todo el equipo de la tarea (admin/owner + autor + responsable + assignees).
- Eliminación responsable con ventana de 60 minutos para el autor; admin/owner modera sin límite temporal.
- Soft-delete con snapshot del eliminador (`deletedByName`, `deletedByEmail`) que sobrevive a borrados del usuario.
- Conservar el `body` original en DB al borrar, pero NO enviarlo al cliente.
- Precálculo server-side de `canDelete` por comentario para evitar exponer identidad del viewer.

**Non-Goals:**

- Edición de comentarios. Una vez enviado, solo se puede borrar (dentro de ventana / por admin).
- Markdown / HTML / adjuntos / menciones / reacciones / threading. Queda para futuras propuestas.
- Paginación. v1 trae todos los comentarios de la tarea.
- Notificaciones (email, push) cuando alguien comenta. Fuera de scope.
- Optimistic UI updates. v1 hace round-trip server y revalida.
- Indicador de "escribiendo…" / presencia en tiempo real.
- Hard-delete o GDPR-erase. Soft-delete conserva el body en DB; otra propuesta cubre eso si se necesita.

## Decisions

### D1. Tabla `task_comment` en `lib/db/schema/task.ts` (no archivo nuevo)

Agregamos la tabla en el mismo archivo donde viven `task` y `task_assignee`. Coherente con el patrón del proyecto y reduce ruido de imports.

Columnas:

```ts
export const taskComment = pgTable(
  "task_comment",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id").notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    authorId: text("author_id").notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedByName: text("deleted_by_name"),
    deletedByEmail: text("deleted_by_email"),
  },
  (table) => [
    index("task_comment_task_id_created_at_idx")
      .on(table.taskId, table.createdAt),
    index("task_comment_author_id_idx").on(table.authorId),
  ],
);
```

`ON DELETE CASCADE` en ambas FKs honra los Scenarios "Comentario se borra en cascada al borrar la tarea" y "al borrar el usuario autor". El snapshot del eliminador (`deletedByName`, `deletedByEmail`) NO es FK: por diseño debe sobrevivir a borrados.

**Alternativa considerada**: tabla aparte `task-comment.ts`. Rechazada — coherencia con `task_assignee` que vive junto a `task`.

### D2. Constante `COMMENT_EDIT_WINDOW_MINUTES = 60` en un solo lugar

Definida en `next-app/lib/tasks/comments.ts` (módulo nuevo). Server actions y `computeCommentCanDelete` la importan. UI nunca recibe el número; recibe el booleano precalculado.

### D3. Server actions en archivo separado `next-app/lib/tasks/comment-actions.ts`

Razón: `actions.ts` ya tiene 10 actions; agregar 2 más empeora la legibilidad. Mantener patrón `"use server"`, `ActionResult<T>`, autorización con guards existentes, `revalidatePath(['/admin/tasks', '/tasks'])`.

Actions:

```ts
export async function createComment(input: CreateCommentInput): Promise<ActionResult<{ commentId: string }>>;
export async function deleteComment(input: DeleteCommentInput): Promise<ActionResult>;
```

Schemas en `next-app/lib/tasks/schemas.ts` (agregado al existente):

```ts
export const createCommentSchema = z.object({
  taskId: z.string().min(1),
  body: z.string().trim().min(1, "El comentario no puede estar vacío.").max(2000),
});

export const deleteCommentSchema = z.object({
  commentId: z.string().min(1),
});
```

**Autorización**:

- `createComment`: reusa la regla de visibilidad de tarea ya implementada. Helper compartido `assertCanViewTask({ taskId, viewer })` que admin/owner pasa siempre y member solo si `task.visibility === 'active'` y participa. Si la regla no existe como helper aislado hoy (`queries.ts` lo aplica inline en `listTasksForMember`), extraerla durante la implementación.
- `deleteComment`: carga el comentario + tarea (join), aplica la decisión:
  - si `viewer.role` es admin/owner → autorizado
  - si `viewer.id === comment.authorId` y `now - createdAt < 60 min` → autorizado
  - otro caso → falla
- Idempotencia: si `comment.deletedAt != null` → retorna `{ ok: true }` sin tocar la fila (Scenario "Borrado idempotente").

### D4. Lectura: query nueva `listCommentsForTask(taskId, viewer)` en `queries.ts`

Devuelve `TaskCommentView[]` ordenado por `createdAt ASC`, con join a `user` para obtener `authorName`, `authorEmail`, `authorImage`. Cada fila trae `canDelete` precalculado y `body` proyectado a `null` cuando `deletedAt != null`:

```ts
export type TaskCommentView = {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string | null;
  authorEmail: string | null;
  authorImage: string | null;
  body: string | null; // null si deletedAt != null
  createdAt: Date;
  deletedAt: Date | null;
  deletedByName: string | null;
  deletedByEmail: string | null;
  canDelete: boolean;
};
```

El precálculo de `canDelete`:

```ts
const isAdmin = viewer.role === "admin" || viewer.role === "owner";
const isAuthor = comment.authorId === viewer.userId;
const withinWindow = now - comment.createdAt < 60 * 60 * 1000;
const canDelete = (!comment.deletedAt) && (isAdmin || (isAuthor && withinWindow));
```

Comentarios ya eliminados llegan con `canDelete = false` (no se borra dos veces; idempotente sí, pero la UI no muestra botón).

**Alternativa considerada**: extender `listTasksForAdmin` / `listTasksForMember` para incluir comentarios en el mismo response. Rechazada — comentarios solo se necesitan al abrir el detail, no al listar. Mantener una query separada `listCommentsForTask` invocada por el server component del detail.

### D5. UI: `TaskCommentsPanel` reemplaza `TaskCommentsPlaceholder`

Nuevo `next-app/components/tasks/task-comments-panel.tsx`. El placeholder se elimina. `task-detail-pane.tsx` cambia el import.

Props:

```ts
type TaskCommentsPanelProps = {
  taskId: string;
  comments: TaskCommentView[];
  canComment: boolean;
};
```

Estructura visual (estilo chat):

```
┌──────────────────────────────────────────────┐
│ Comentarios                                  │  ← título sticky o simple header
├──────────────────────────────────────────────┤
│ [avatar] Eduin · hace 5 min                  │
│ Texto del comentario                         │
│                                              │
│ [avatar] Carla · hace 3 min                  │
│ Texto otro                                   │
│                                              │
│ [avatar] Pepe · hace 1 min   [Eliminar]      │  ← botón solo si canDelete
│ Comentario eliminado por el autor.           │  ← si está eliminado
│                                              │
├──────────────────────────────────────────────┤  ← composer al pie
│ [Textarea]                                   │
│                                Enviar →      │
└──────────────────────────────────────────────┘
```

Decisiones de UI:

- Avatar: `<Avatar>` de shadcn (`components/ui/avatar.tsx`); fallback con iniciales.
- Timestamp relativo: helper local con `Intl.RelativeTimeFormat('es')` (sin librería extra). Se recalcula al montar y cada 60s vía `setInterval` para que los "hace 1 min" se vuelvan "hace 2 min" sin recargar.
- Composer: `<Textarea rows={2}>` con `resize-y`, `max-h-[120px]`, `placeholder="Escribe un comentario…"`. Botón "Enviar" (Phosphor `PaperPlaneRight`). Enter envía (preventDefault), Shift+Enter inserta `\n`.
- Estado del composer: `useState` para `body`; en submit limpia y `router.refresh()` tras éxito.
- Mensaje de error: render inline debajo del composer (`<p className="text-destructive text-sm">`).
- Lista scrollea con `flex-1 overflow-y-auto`; composer queda sticky abajo. El detail pane ya tiene la descripción scrollable arriba (heredado de `add-tasks-inbox-and-admin-edit`); el panel de comentarios queda como sección separada al final.
- Render de eliminado: si `comment.deletedAt`, render `<p className="text-muted-foreground italic text-sm">` con el placeholder correspondiente. Avatar y timestamp del autor original se conservan.
- Si `!canComment`: composer no se renderiza; solo se muestra la lista.

### D6. `TaskCapabilities` gana `canComment`

`computeCapabilities` en `lib/tasks/capabilities.ts` agrega:

```ts
const canComment =
  isAdmin ||
  (visibility === "active" &&
   (isAuthor || isResponsible || isAssignee));
```

Esto requiere extender la entrada de `computeCapabilities` con `isResponsible` y `isAssignee`. Hoy `task` recibido es `Pick<TaskListItem, "authorId" | "visibility">`. Ampliar a `Pick<TaskListItem, "authorId" | "visibility" | "responsibleId" | "assignees">` y derivar booleanos.

`readOnlyCapabilities` agrega `canComment: false`.

### D7. Wire-up server-side

En `app/admin/tasks/page.tsx` y `app/(app)/tasks/page.tsx` (donde se carga la tarea seleccionada para el detail):

1. Si hay `taskId` en searchParams y el viewer tiene visibilidad: cargar comentarios con `listCommentsForTask(taskId, viewer)`.
2. Pasar `comments` al `TaskDetailPane`, que a su vez los baja al `TaskCommentsPanel`.
3. `canComment` viaja dentro del objeto `capabilities` ya propagado.

### D8. Manejo de errores y refresh

Tras `createComment.ok` o `deleteComment.ok`: el cliente llama `router.refresh()`. La server action ya invoca `revalidatePath(['/admin/tasks', '/tasks'])`, así que el server component re-fetchea con los comentarios actualizados.

Caso "60 min desfasados": si el botón "Eliminar" se renderizó dentro de la ventana pero la action llega fuera, la action retorna `{ ok: false, error: "La ventana de eliminación de 60 minutos expiró." }`. El panel muestra el error inline.

### D9. Migration plan de datos

Drizzle migration nueva. Sin backfill (tabla vacía). Sin riesgo sobre datos existentes.

### D10. Decisiones rápidas (no entran en alternativas)

- **ID de comentarios**: `randomUUID()` server-side, igual que `task.id`.
- **Sanitización**: el render usa `{comment.body}` como text node (JSX escapa por defecto). No se usa `dangerouslySetInnerHTML`.
- **Saltos de línea**: el body se renderiza con `whitespace-pre-wrap` para preservar `\n` introducidos con Shift+Enter.
- **Foco del composer**: no auto-focus al cambiar de tarea (evita robar foco al usuario que solo lee).

## Risks / Trade-offs

- [El render server-side de `canDelete` depende del clock del server; si el cliente y server desfasan, el botón puede mostrarse y la action rechaza] → mitigación: precálculo en server al renderizar; la action revalida con el mismo reloj. El usuario ve el error claro y el botón desaparece tras `router.refresh()`.

- [Sin paginación, una tarea con cientos de comentarios cargará todo en cada apertura del detail] → aceptado para v1; el uso real esperado es <50 comentarios por tarea. Si emerge dolor, propuesta futura agrega `LIMIT` + "cargar más".

- [`router.refresh()` después de cada envío puede sentirse lento sin optimistic UI] → aceptado para v1. El composer se deshabilita en submit para evitar dobles envíos. Si la latencia molesta, una propuesta futura agrega `useOptimistic`.

- [`Intl.RelativeTimeFormat` con `setInterval` re-renderea cada minuto el panel] → cost-benefit: refresh barato, mejora percepción. Si causa jank con muchas filas, cambiar a re-render diferido (`requestIdleCallback`).

- [Borrado físico cascading: si un admin borra una tarea en draft, los comentarios se pierden sin papelera] → consistente con `task_assignee` (mismo patrón) y con la semántica de "draft = scratch". Tareas active/archived no se pueden borrar físicamente.

- [Snapshot `deletedByName`/`deletedByEmail` queda desactualizado si el admin renombra su perfil después de moderar] → aceptado y deseado: el snapshot refleja el momento del acto.

- [PR mediano (estimado 350–500 líneas: schema + migration + actions + queries + panel + wire-up)] → cabe en budget `400` con margen estrecho. Si crece, dividir en (1) schema+actions+queries y (2) UI+wire-up en stacked PR.

## Migration Plan

1. Schema: agregar `taskComment` y sus relations a `next-app/lib/db/schema/task.ts`; exportar desde `index.ts`.
2. Generar migración Drizzle (`drizzle-kit generate`); verificar que cree la tabla y los índices.
3. Crear `next-app/lib/tasks/comments.ts` con `COMMENT_EDIT_WINDOW_MINUTES` y helpers de cálculo.
4. Crear `next-app/lib/tasks/comment-actions.ts` (`createComment`, `deleteComment`).
5. Extender `next-app/lib/tasks/schemas.ts` con `createCommentSchema`, `deleteCommentSchema`.
6. Extender `next-app/lib/tasks/queries.ts` con `listCommentsForTask`, tipo `TaskCommentView`. Si no existe, agregar `assertCanViewTask` extrayendo la regla ya usada en queries existentes.
7. Extender `next-app/lib/tasks/capabilities.ts`: agregar `canComment` a `TaskCapabilities`, actualizar `computeCapabilities` y `readOnlyCapabilities`.
8. Crear `next-app/components/tasks/task-comments-panel.tsx`.
9. Eliminar `next-app/components/tasks/task-comments-placeholder.tsx`.
10. Actualizar `next-app/components/tasks/task-detail-pane.tsx`: cambiar el import y la firma; aceptar `comments` y `canComment` por props (o leerlas del `capabilities`).
11. Wire-up en `next-app/app/admin/tasks/page.tsx` y `next-app/app/(app)/tasks/page.tsx`: cargar comentarios cuando hay `taskId` seleccionado, pasarlos al detail pane.
12. Smoke test manual:
    - Admin comenta en draft, active, archived → ok.
    - Member responsable comenta en active → ok; intenta en draft → falla (no debería ni ver la tarea).
    - Autor borra a los 30 min → ok; intenta a los 61 min → falla con mensaje claro.
    - Admin borra comentario ajeno antiguo → ok, render `"Comentario eliminado por {nombre admin}."`.
    - Refresh tras envío y tras borrado → lista actualizada.

Rollback: revertir el PR. La tabla `task_comment` queda en DB pero sin uso; en un siguiente deploy se puede dropear con una migración inversa si se decide.

## Open Questions

- ¿Debe haber un contador "X comentarios" visible en la lista (junto al título de la tarea) para que los usuarios sepan que hay conversación sin abrir el detail? — fuera de scope para v1; queda como mejora.
- ¿La acción "Eliminar" del comentario necesita confirmación (`AlertDialog`) o es inmediata? — propuesto: inmediata para v1 dado que es soft-delete recuperable por admin si se necesita. Si el usuario lo pide en QA, agregamos `AlertDialog`.
