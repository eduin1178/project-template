import { redirect } from "next/navigation";

import { computeTaskCapabilities } from "@/components/tasks/capabilities";
import { TaskDetailPane } from "@/components/tasks/task-detail-pane";
import { TasksFiltersPanel } from "@/components/tasks/tasks-filters-panel";
import { TasksListPanel } from "@/components/tasks/tasks-list-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { isOrgAdmin, requireOrgMember } from "@/lib/auth/guards";
import {
  TASK_STATUS_VALUES,
  type TaskStatus,
} from "@/lib/db/schema/task";
import {
  getTaskByIdForViewer,
  getTaskCounts,
  listCommentsForTask,
  listOrgMembers,
  listTasks,
  listTasksForMember,
  type TaskListItem,
} from "@/lib/tasks/queries";

export const metadata = { title: "Mis tareas — Docentix" };

function parseMulti<T extends string>(
  raw: string | string[] | undefined,
  allowed: ReadonlyArray<T>,
): T[] {
  if (!raw) return [];
  const values = Array.isArray(raw) ? raw : raw.split(",");
  return values.filter((v): v is T => allowed.includes(v as T));
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let ctx;
  try {
    ctx = await requireOrgMember();
  } catch {
    redirect("/login");
  }

  const params = await searchParams;
  const status =
    "status" in params
      ? parseMulti<TaskStatus>(params.status, TASK_STATUS_VALUES)
      : (["pending", "in_progress"] as TaskStatus[]);
  const selectedId =
    typeof params.taskId === "string" && params.taskId.length > 0
      ? params.taskId
      : null;

  const isAdmin = isOrgAdmin(ctx.role);

  const tasksPromise: Promise<TaskListItem[]> = isAdmin
    ? listTasks({
        orgId: ctx.orgId,
        filters: { visibility: ["active"], status },
      })
    : listTasksForMember({
        orgId: ctx.orgId,
        userId: ctx.userId,
        filters: { status },
      });

  const [tasks, counts, selectedExplicit, members] = await Promise.all([
    tasksPromise,
    getTaskCounts({ orgId: ctx.orgId }),
    selectedId
      ? getTaskByIdForViewer({
          orgId: ctx.orgId,
          taskId: selectedId,
          viewerUserId: ctx.userId,
          isAdmin,
        })
      : Promise.resolve(null),
    listOrgMembers({ orgId: ctx.orgId }),
  ]);

  const selected = selectedExplicit ?? (tasks.length > 0 ? tasks[0] : null);

  const comments = selected
    ? await listCommentsForTask({
        taskId: selected.id,
        viewerUserId: ctx.userId,
        isAdmin,
      })
    : [];

  return (
    <div className="bg-background -mx-6 -my-8 flex h-[calc(100vh-4rem)] overflow-hidden">
      <aside className="bg-muted/30 hidden w-64 shrink-0 overflow-y-auto border-r p-4 md:block">
        <TasksFiltersPanel
          initialVisibility={[]}
          initialStatus={status}
          counts={counts}
          basePath="/tasks"
          showVisibility={false}
        />
      </aside>

      <section className="flex w-full max-w-110 shrink-0 flex-col border-r">
        <header className="flex flex-col gap-3 border-b p-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold">Mis tareas</h1>
          </div>
        </header>
        <TasksListPanel
          tasks={tasks}
          selectedId={selected?.id ?? null}
          basePath="/tasks"
        />
      </section>

      <section className="hidden flex-1 flex-col lg:flex">
        {selected ? (
          <TaskDetailPane
            task={selected}
            members={members}
            capabilities={computeTaskCapabilities({
              task: selected,
              viewer: { userId: ctx.userId, role: ctx.role },
            })}
            comments={comments}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-8">
            <EmptyState
              title="Selecciona una tarea"
              description="Elige una tarea de la lista para ver su detalle."
            />
          </div>
        )}
      </section>
    </div>
  );
}
