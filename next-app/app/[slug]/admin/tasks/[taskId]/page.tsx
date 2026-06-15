import { notFound, redirect } from "next/navigation";

import { computeTaskCapabilities } from "@/components/tasks/capabilities";
import { TaskFullPageDetail } from "@/components/tasks/task-full-page-detail";
import { isOrgAdmin, requireWorkspaceMemberBySlug } from "@/lib/auth/guards";
import { type TaskStatus } from "@/lib/db/schema/task";
import {
  getTaskWithAuthorById,
  listChecklistItemsForTask,
  listCommentsForTask,
  listDocumentsForTask,
} from "@/lib/tasks/queries";
import {
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

  const backHref = `/${slug}/admin/tasks${preservedQuery(route.params)}`;

  return (
    <TaskFullPageDetail
      task={selected}
      members={route.members}
      capabilities={computeTaskCapabilities({
        task: selected,
        viewer: { userId: ctx.userId, role: ctx.role },
      })}
      comments={comments}
      documents={documents}
      checklistItems={checklistItems}
      backHref={backHref}
    />
  );
}

