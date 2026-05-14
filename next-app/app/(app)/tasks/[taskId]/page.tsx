import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { TaskCard } from "@/components/tasks/task-card";
import { Button } from "@/components/ui/button";
import { isOrgAdmin, requireOrgMember } from "@/lib/auth/guards";
import { getTaskByIdForViewer } from "@/lib/tasks/queries";

export const metadata = { title: "Detalle de tarea — Docentix" };

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  let ctx;
  try {
    ctx = await requireOrgMember();
  } catch {
    redirect("/login");
  }

  const { taskId } = await params;
  const task = await getTaskByIdForViewer({
    orgId: ctx.orgId,
    taskId,
    viewerUserId: ctx.userId,
    isAdmin: isOrgAdmin(ctx.role),
  });

  if (!task) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-8">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Detalle de la tarea</h1>
        <Button asChild variant="ghost" size="sm">
          <Link href="/tasks">Volver</Link>
        </Button>
      </header>

      <TaskCard task={task} />

      {task.description ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Descripción</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {task.description}
          </p>
        </section>
      ) : null}
    </div>
  );
}
