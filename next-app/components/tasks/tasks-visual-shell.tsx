import { TasksVisibilityFilter } from "@/components/tasks/tasks-visibility-filter";
import { TasksViewToggle } from "@/components/tasks/tasks-view-toggle";
import { TasksVisualList } from "@/components/tasks/tasks-visual-list";
import {
  type TaskStatus,
  type TaskVisibility,
} from "@/lib/db/schema/task";
import type { TaskCounts, TaskListItem } from "@/lib/tasks/queries";
import type { TaskListViewMode } from "@/lib/tasks/route-data";

export function TasksVisualShell({
  initialVisibility,
  initialStatus,
  counts,
  tasks,
  basePath,
  showVisibility,
  activeFiltersCount,
  viewMode,
  listHeader,
}: {
  initialVisibility: TaskVisibility[];
  initialStatus: TaskStatus[];
  counts: TaskCounts;
  tasks: TaskListItem[];
  basePath: string;
  showVisibility: boolean;
  activeFiltersCount: number;
  viewMode: TaskListViewMode;
  listHeader?: React.ReactNode;
}) {
  const title = basePath.endsWith("/admin/tasks") ? "Tareas" : "Mis tareas";
  const description = basePath.endsWith("/admin/tasks")
    ? "Organiza y da seguimiento a las tareas de tu institución."
    : "Consulta y avanza las tareas en las que participas.";

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card/60 p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between lg:p-5">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {showVisibility ? (
            <TasksVisibilityFilter
              initialVisibility={initialVisibility}
              counts={counts}
              basePath={basePath}
              activeCount={activeFiltersCount}
            />
          ) : null}
          <TasksViewToggle basePath={basePath} viewMode={viewMode} />
          {listHeader}
        </div>
      </header>

      <TasksVisualList
        tasks={tasks}
        status={initialStatus}
        basePath={basePath}
        viewMode={viewMode}
      />
    </div>
  );
}
