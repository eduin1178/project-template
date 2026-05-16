import { permanentRedirect, redirect } from "next/navigation";

import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { TasksRouteShell } from "@/components/tasks/tasks-route-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOrgAdmin } from "@/lib/auth/guards";
import { type TaskStatus } from "@/lib/db/schema/task";
import {
  countActiveFilters,
  loadTasksRouteData,
  preservedQuery,
} from "@/lib/tasks/route-data";

export const metadata = { title: "Tareas — Docentix" };

const ADMIN_DEFAULT_STATUS = ["pending"] as TaskStatus[];

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

  // Redirect 308 desde la URL legacy `?taskId=` a la ruta canónica `/admin/tasks/[taskId]`.
  const rawParams = await searchParams;
  if (typeof rawParams.taskId === "string" && rawParams.taskId.length > 0) {
    const taskId = rawParams.taskId;
    const rest: Record<string, string | string[] | undefined> = { ...rawParams };
    delete rest.taskId;
    permanentRedirect(`/admin/tasks/${taskId}${preservedQuery(rest)}`);
  }

  const { params, status, visibility, tasks, counts, members } =
    await loadTasksRouteData({
      orgId: ctx.orgId,
      userId: ctx.userId,
      isAdmin: true,
      searchParams: Promise.resolve(rawParams),
      defaultStatus: ADMIN_DEFAULT_STATUS,
    });

  const defaultDueAt = new Date();
  defaultDueAt.setDate(defaultDueAt.getDate() + 7);
  defaultDueAt.setHours(18, 0, 0, 0);

  return (
    <TasksRouteShell
      initialVisibility={visibility}
      initialStatus={status}
      counts={counts}
      tasks={tasks}
      basePath="/admin/tasks"
      selectedId={null}
      showVisibility={true}
      activeFiltersCount={countActiveFilters(params)}
      listHeader={
        <CreateTaskDialog
          members={members}
          defaultDueAt={defaultDueAt.toISOString()}
        />
      }
      detail={
        <div className="flex flex-1 items-center justify-center p-8">
          <EmptyState
            title="Selecciona una tarea"
            description="Elige una tarea de la lista para ver su detalle y administrar su estado."
          />
        </div>
      }
    />
  );
}
