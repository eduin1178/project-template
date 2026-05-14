import { redirect } from "next/navigation";

import { computeTaskCapabilities } from "@/components/tasks/capabilities";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOrgAdmin } from "@/lib/auth/guards";
import {
  TASK_STATUS_VALUES,
  TASK_VISIBILITY_VALUES,
  type TaskStatus,
  type TaskVisibility,
} from "@/lib/db/schema/task";
import {
  getTaskCounts,
  getTaskWithAuthorById,
  listCommentsForTask,
  listOrgMembers,
  listTasks,
} from "@/lib/tasks/queries";

import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { TaskDetailPane } from "@/components/tasks/task-detail-pane";
import { TasksFiltersPanel } from "@/components/tasks/tasks-filters-panel";
import { TasksListPanel } from "@/components/tasks/tasks-list-panel";

export const metadata = { title: "Tareas — Docentix" };

function parseMulti<T extends string>(
  raw: string | string[] | undefined,
  allowed: ReadonlyArray<T>,
): T[] {
  if (!raw) return [];
  const values = Array.isArray(raw) ? raw : raw.split(",");
  return values.filter((v): v is T => allowed.includes(v as T));
}

export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let ctx;
  try {
    ctx = await requireOrgAdmin();
  } catch {
    redirect("/admin");
  }

  const params = await searchParams;
  const visibility = parseMulti<TaskVisibility>(
    params.visibility,
    TASK_VISIBILITY_VALUES,
  );
  const status =
    "status" in params
      ? parseMulti<TaskStatus>(params.status, TASK_STATUS_VALUES)
      : (["pending"] as TaskStatus[]);
  const selectedId =
    typeof params.taskId === "string" && params.taskId.length > 0
      ? params.taskId
      : null;

  const [tasks, counts, selectedExplicit, members] = await Promise.all([
    listTasks({ orgId: ctx.orgId, filters: { visibility, status } }),
    getTaskCounts({ orgId: ctx.orgId }),
    selectedId
      ? getTaskWithAuthorById({ orgId: ctx.orgId, id: selectedId })
      : Promise.resolve(null),
    listOrgMembers({ orgId: ctx.orgId }),
  ]);

  const selected = selectedExplicit ?? (tasks.length > 0 ? tasks[0] : null);

  const comments = selected
    ? await listCommentsForTask({
        taskId: selected.id,
        viewerUserId: ctx.userId,
        isAdmin: true,
      })
    : [];

  return (
    <div className="bg-background -mx-6 -my-8 flex h-[calc(100vh-4rem)] overflow-hidden">
      <aside className="bg-muted/30 hidden w-64 shrink-0 overflow-y-auto border-r p-4 md:block">
        <TasksFiltersPanel
          initialVisibility={visibility}
          initialStatus={status}
          counts={counts}
        />
      </aside>

      <section className="flex w-full max-w-110 shrink-0 flex-col border-r">
        <header className="flex flex-col gap-3 border-b p-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold">Tareas</h1>
            <CreateTaskDialog members={members} />
          </div>
        </header>
        <TasksListPanel
          tasks={tasks}
          selectedId={selected?.id ?? null}
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
              description="Elige una tarea de la lista para ver su detalle y administrar su estado."
            />
          </div>
        )}
      </section>
    </div>
  );
}
