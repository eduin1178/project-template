import { notFound, permanentRedirect } from "next/navigation";

import { TasksRouteShell } from "@/components/tasks/tasks-route-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { isOrgAdmin, requireWorkspaceMemberBySlug } from "@/lib/auth/guards";
import { type TaskStatus } from "@/lib/db/schema/task";
import {
  countActiveFilters,
  loadTasksRouteData,
  preservedQuery,
} from "@/lib/tasks/route-data";

export const metadata = { title: "Mis tareas — Docentix" };

const MEMBER_DEFAULT_STATUS = ["pending", "in_progress"] as TaskStatus[];

export default async function WorkspaceTasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  let ctx;
  try {
    ctx = await requireWorkspaceMemberBySlug(slug);
  } catch {
    notFound();
  }

  const rawParams = await searchParams;
  if (typeof rawParams.taskId === "string" && rawParams.taskId.length > 0) {
    const taskId = rawParams.taskId;
    const rest: Record<string, string | string[] | undefined> = { ...rawParams };
    delete rest.taskId;
    permanentRedirect(
      `/${slug}/tasks/${taskId}${preservedQuery(rest)}`,
    );
  }

  const isAdmin = isOrgAdmin(ctx.role);
  const { params: routeParams, status, visibility, tasks, counts } =
    await loadTasksRouteData({
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
      basePath={`/${slug}/tasks`}
      selectedId={null}
      showVisibility={false}
      activeFiltersCount={countActiveFilters(routeParams)}
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
