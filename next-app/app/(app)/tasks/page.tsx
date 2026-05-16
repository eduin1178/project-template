import { permanentRedirect, redirect } from "next/navigation";

import { TasksRouteShell } from "@/components/tasks/tasks-route-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { isOrgAdmin, requireOrgMember } from "@/lib/auth/guards";
import { type TaskStatus } from "@/lib/db/schema/task";
import {
  countActiveFilters,
  loadTasksRouteData,
  preservedQuery,
} from "@/lib/tasks/route-data";

export const metadata = { title: "Mis tareas — Docentix" };

const MEMBER_DEFAULT_STATUS = ["pending", "in_progress"] as TaskStatus[];

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

  // Redirect 308 desde la URL legacy `?taskId=` a la ruta canónica `/tasks/[taskId]`.
  const rawParams = await searchParams;
  if (typeof rawParams.taskId === "string" && rawParams.taskId.length > 0) {
    const taskId = rawParams.taskId;
    const rest: Record<string, string | string[] | undefined> = { ...rawParams };
    delete rest.taskId;
    permanentRedirect(`/tasks/${taskId}${preservedQuery(rest)}`);
  }

  const isAdmin = isOrgAdmin(ctx.role);
  const { params, status, visibility, tasks, counts } = await loadTasksRouteData({
    orgId: ctx.orgId,
    userId: ctx.userId,
    isAdmin,
    searchParams: Promise.resolve(rawParams),
    defaultStatus: MEMBER_DEFAULT_STATUS,
  });

  return (
    <TasksRouteShell
      initialVisibility={visibility}
      initialStatus={status}
      counts={counts}
      tasks={tasks}
      basePath="/tasks"
      selectedId={null}
      showVisibility={false}
      activeFiltersCount={countActiveFilters(params)}
      detail={
        <div className="flex flex-1 items-center justify-center p-8">
          <EmptyState
            title="Selecciona una tarea"
            description="Elige una tarea de la lista para ver su detalle."
          />
        </div>
      }
    />
  );
}
