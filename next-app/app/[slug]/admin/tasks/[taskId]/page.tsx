import { notFound, redirect } from "next/navigation";

import { computeTaskCapabilities } from "@/components/tasks/capabilities";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { MobileBackToList } from "@/components/tasks/mobile-back-to-list";
import { TaskDetailPane } from "@/components/tasks/task-detail-pane";
import { TasksRouteShell } from "@/components/tasks/tasks-route-shell";
import { isOrgAdmin, requireWorkspaceMemberBySlug } from "@/lib/auth/guards";
import { type TaskStatus } from "@/lib/db/schema/task";
import {
  getTaskWithAuthorById,
  listChecklistItemsForTask,
  listCommentsForTask,
  listDocumentsForTask,
} from "@/lib/tasks/queries";
import {
  countActiveFilters,
  loadTasksRouteData,
  preservedQuery,
} from "@/lib/tasks/route-data";

export const metadata = { title: "Tarea — Docentix" };

const ADMIN_DEFAULT_STATUS = ["pending"] as TaskStatus[];

export default async function WorkspaceAdminTaskDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; taskId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug, taskId } = await params;
  let ctx;
  try {
    ctx = await requireWorkspaceMemberBySlug(slug);
  } catch {
    notFound();
  }
  if (!isOrgAdmin(ctx.role)) {
    redirect(`/${slug}`);
  }

  const [route, selected] = await Promise.all([
    loadTasksRouteData({
      orgId: ctx.orgId,
      userId: ctx.userId,
      isAdmin: true,
      searchParams,
      defaultStatus: ADMIN_DEFAULT_STATUS,
    }),
    getTaskWithAuthorById({ orgId: ctx.orgId, id: taskId }),
  ]);

  if (!selected) notFound();

  const [comments, documents, checklistItems] = await Promise.all([
    listCommentsForTask({
      taskId: selected.id,
      viewerUserId: ctx.userId,
      viewerRole: ctx.role,
      isAdmin: true,
      taskAuthorId: selected.authorId,
      taskDueAt: selected.dueAt,
    }),
    listDocumentsForTask({
      taskId: selected.id,
      viewerUserId: ctx.userId,
      viewerRole: ctx.role,
      isAdmin: true,
      taskAuthorId: selected.authorId,
      taskDueAt: selected.dueAt,
    }),
    listChecklistItemsForTask({ taskId: selected.id }),
  ]);

  const defaultDueAt = new Date();
  defaultDueAt.setDate(defaultDueAt.getDate() + 7);
  defaultDueAt.setHours(18, 0, 0, 0);

  const backHref = `/${slug}/admin/tasks${preservedQuery(route.params)}`;

  return (
    <TasksRouteShell
      initialVisibility={route.visibility}
      initialStatus={route.status}
      counts={route.counts}
      tasks={route.tasks}
      basePath={`/${slug}/admin/tasks`}
      selectedId={selected.id}
      showVisibility={true}
      activeFiltersCount={countActiveFilters(route.params)}
      listHeader={
        <CreateTaskDialog
          members={route.members}
          defaultDueAt={defaultDueAt.toISOString()}
        />
      }
      detail={
        <>
          <MobileBackToList href={backHref} />
          <TaskDetailPane
            task={selected}
            members={route.members}
            capabilities={computeTaskCapabilities({
              task: selected,
              viewer: { userId: ctx.userId, role: ctx.role },
            })}
            comments={comments}
            documents={documents}
            checklistItems={checklistItems}
          />
        </>
      }
    />
  );
}
