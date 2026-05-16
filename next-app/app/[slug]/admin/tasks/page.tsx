import { notFound, permanentRedirect, redirect } from "next/navigation";

import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { TasksRouteShell } from "@/components/tasks/tasks-route-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { isOrgAdmin, requireWorkspaceMemberBySlug } from "@/lib/auth/guards";
import { type TaskStatus } from "@/lib/db/schema/task";
import {
  countActiveFilters,
  loadTasksRouteData,
  preservedQuery,
} from "@/lib/tasks/route-data";

export const metadata = { title: "Tareas — Docentix" };

const ADMIN_DEFAULT_STATUS = ["pending"] as TaskStatus[];

export default async function WorkspaceAdminTasksPage({
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
  if (!isOrgAdmin(ctx.role)) {
    redirect(`/${slug}`);
  }

  const rawParams = await searchParams;
  if (typeof rawParams.taskId === "string" && rawParams.taskId.length > 0) {
    const taskId = rawParams.taskId;
    const rest: Record<string, string | string[] | undefined> = { ...rawParams };
    delete rest.taskId;
    permanentRedirect(
      `/${slug}/admin/tasks/${taskId}${preservedQuery(rest)}`,
    );
  }

  const { params: routeParams, status, visibility, tasks, counts, members } =
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
      basePath={`/${slug}/admin/tasks`}
      selectedId={null}
      showVisibility={true}
      activeFiltersCount={countActiveFilters(routeParams)}
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
