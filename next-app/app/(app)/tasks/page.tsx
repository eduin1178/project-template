import { redirect } from "next/navigation";

import { TaskReadonlyList } from "@/components/tasks/task-readonly-list";
import { isOrgAdmin, requireOrgMember } from "@/lib/auth/guards";
import { listTasks, listTasksForMember } from "@/lib/tasks/queries";

export const metadata = { title: "Mis tareas — Docentix" };

export default async function TasksPage() {
  let ctx;
  try {
    ctx = await requireOrgMember();
  } catch {
    redirect("/login");
  }

  const tasks = isOrgAdmin(ctx.role)
    ? await listTasks({
        orgId: ctx.orgId,
        filters: { visibility: ["active"] },
      })
    : await listTasksForMember({ orgId: ctx.orgId, userId: ctx.userId });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Mis tareas</h1>
        <p className="text-muted-foreground text-sm">
          Tareas activas en tu organización donde participas como autor,
          responsable o equipo de apoyo.
        </p>
      </header>
      <TaskReadonlyList tasks={tasks} />
    </div>
  );
}
