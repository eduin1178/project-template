import { TasksFiltersPanel } from "@/components/tasks/tasks-filters-panel";
import { TasksListPanel } from "@/components/tasks/tasks-list-panel";
import { FiltersTrigger } from "@/components/tasks/tasks-shell";
import {
  type TaskStatus,
  type TaskVisibility,
} from "@/lib/db/schema/task";
import type { TaskCounts, TaskListItem } from "@/lib/tasks/queries";
import { cn } from "@/lib/utils";

/**
 * Shell server-rendered de las rutas de bandeja de tareas.
 *
 * - Renderiza el botón "Filtros" en TODOS los viewports que abre un Sheet con el panel.
 * - Renderiza la lista de tareas. La columna de la lista se oculta en mobile cuando hay
 *   `selectedId` (se está viendo el detalle).
 * - Renderiza el slot `detail` a la derecha (detalle o empty state).
 *
 * Las clases responsivas controlan visibilidad por viewport sin necesidad de JS.
 */
export function TasksRouteShell({
  initialVisibility,
  initialStatus,
  counts,
  tasks,
  basePath,
  selectedId,
  showVisibility,
  activeFiltersCount,
  listHeader,
  detail,
}: {
  initialVisibility: TaskVisibility[];
  initialStatus: TaskStatus[];
  counts: TaskCounts;
  tasks: TaskListItem[];
  basePath: string;
  selectedId: string | null;
  showVisibility: boolean;
  activeFiltersCount: number;
  /** Slot opcional para acciones en la cabecera de la lista (ej. botón "Nueva tarea"). */
  listHeader?: React.ReactNode;
  /** Slot del panel derecho (detalle o empty state). */
  detail: React.ReactNode;
}) {
  const filtersPanel = (
    <TasksFiltersPanel
      initialVisibility={initialVisibility}
      initialStatus={initialStatus}
      counts={counts}
      basePath={basePath}
      showVisibility={showVisibility}
    />
  );

  return (
    <div className="bg-background -mx-6 -my-8 flex h-[calc(100vh-4rem)] overflow-hidden">
      <section
        className={cn(
          "min-w-0 flex-col border-r",
          // Mobile/tablet (<lg): si hay selección, la lista se oculta y el detalle
          //   ocupa todo el ancho restante. Si no hay selección, la lista crece
          //   con `flex-1` para llenar el espacio restante.
          // Desktop (lg+): la lista pasa a un ancho fijo de 110.
          selectedId
            ? "hidden lg:flex lg:w-110 lg:max-w-110 lg:shrink-0"
            : "flex flex-1 lg:w-110 lg:max-w-110 lg:flex-none lg:shrink-0",
        )}
      >
        <header className="flex flex-col gap-3 border-b p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FiltersTrigger activeCount={activeFiltersCount}>
                {filtersPanel}
              </FiltersTrigger>
              <h1 className="text-lg font-semibold">
                {basePath.endsWith("/admin/tasks") ? "Tareas" : "Mis tareas"}
              </h1>
            </div>
            {listHeader}
          </div>
        </header>
        <TasksListPanel
          tasks={tasks}
          selectedId={selectedId}
          basePath={basePath}
        />
      </section>

      <section
        className={cn(
          "min-w-0 flex-1 flex-col",
          selectedId ? "flex" : "hidden lg:flex",
        )}
      >
        {detail}
      </section>
    </div>
  );
}
