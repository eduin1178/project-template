import { notFound } from "next/navigation";

import { computeTaskCapabilities } from "@/components/tasks/capabilities";
import { TaskFullPageDetail } from "@/components/tasks/task-full-page-detail";
import { isOrgAdmin, requireWorkspaceMemberBySlug } from "@/lib/auth/guards";
import { type TaskStatus } from "@/lib/db/schema/task";
import {
  getTaskByIdForViewer,
  listChecklistItemsForTask,
  listCommentsForTask,
  listDocumentsForTask,
} from "@/lib/tasks/queries";
import {
  loadTasksRouteData,
  preservedQuery,
} from "@/lib/tasks/route-data";

export const metadata = { title: "Tarea — Docentix" };

const MEMBER_DEFAULT_STATUS = ["pending", "in_progress"] as TaskStatus[];

export default async function WorkspaceTaskDetailPage({
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

  const isAdmin = isOrgAdmin(ctx.role);

  const [route, selected] = await Promise.all([
    loadTasksRouteData({
      orgId: ctx.orgId,
      userId: ctx.userId,
      isAdmin,
      searchParams,
      defaultStatus: MEMBER_DEFAULT_STATUS,
    }),
    getTaskByIdForViewer({
      orgId: ctx.orgId,
      taskId,
      viewerUserId: ctx.userId,
      isAdmin,
    }),
  ]);

  if (!selected) notFound();

  const [comments, documents, checklistItems] = await Promise.all([
    listCommentsForTask({
      taskId: selected.id,
      viewerUserId: ctx.userId,
      viewerRole: ctx.role,
      isAdmin,
      taskAuthorId: selected.authorId,
      taskDueAt: selected.dueAt,
    }),
    listDocumentsForTask({
      taskId: selected.id,
      viewerUserId: ctx.userId,
      viewerRole: ctx.role,
      isAdmin,
      taskAuthorId: selected.authorId,
      taskDueAt: selected.dueAt,
    }),
    listChecklistItemsForTask({ taskId: selected.id }),
  ]);

  const backHref = `/${slug}/tasks${preservedQuery(route.params)}`;

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

