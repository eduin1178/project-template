import { notFound, permanentRedirect } from "next/navigation";

import { TasksVisualShell } from "@/components/tasks/tasks-visual-shell";
import { isOrgAdmin, requireWorkspaceMemberBySlug } from "@/lib/auth/guards";
import { type TaskStatus } from "@/lib/db/schema/task";
import {
  countActiveFilters,
  loadTasksRouteData,
  preservedQuery,
} from "@/lib/tasks/route-data";

export const metadata = { title: "Mis tareas — Docentix" };

const MEMBER_DEFAULT_STATUS = [] as TaskStatus[];

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
  const { params: routeParams, viewMode, status, visibility, tasks, counts } =
    await loadTasksRouteData({
      orgId: ctx.orgId,
      userId: ctx.userId,
      isAdmin,
      searchParams: Promise.resolve(rawParams),
      defaultStatus: MEMBER_DEFAULT_STATUS,
    });

  return (
    <TasksVisualShell
      initialVisibility={visibility}
      initialStatus={status}
      counts={counts}
      tasks={tasks}
      basePath={`/${slug}/tasks`}
      showVisibility={false}
      activeFiltersCount={countActiveFilters(routeParams)}
      viewMode={viewMode}
    />
  );
}
