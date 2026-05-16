import { notFound } from "next/navigation";
import {
  CheckCircle,
  Clock,
  ClockCounterClockwise,
  ListChecks,
  Warning,
} from "@phosphor-icons/react/dist/ssr";

import { CompletionBar } from "@/components/dashboard/completion-bar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { StatusDonut } from "@/components/dashboard/status-donut";
import { StorageCard } from "@/components/dashboard/storage-card";
import { TopTasksList } from "@/components/dashboard/top-tasks-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireWorkspaceMemberBySlug } from "@/lib/auth/guards";
import { getMemberDashboard } from "@/lib/dashboard/queries";

export const metadata = { title: "Inicio — Docentix" };

export default async function WorkspaceDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let ctx;
  try {
    ctx = await requireWorkspaceMemberBySlug(slug);
  } catch {
    notFound();
  }

  const data = await getMemberDashboard(ctx.orgId, ctx.userId);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Tu panel</h1>
        <p className="text-muted-foreground text-sm">
          Resumen de las tareas en las que participas.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Pendientes"
          value={data.pending}
          icon={<ListChecks size={20} weight="duotone" />}
        />
        <KpiCard
          label="En curso"
          value={data.inProgress}
          icon={<Clock size={20} weight="duotone" />}
        />
        <KpiCard
          label="Hechas"
          value={data.done}
          icon={<CheckCircle size={20} weight="duotone" />}
        />
        <KpiCard
          label="Vencidas sin terminar"
          value={data.overdue}
          variant={data.overdue > 0 ? "alert" : "default"}
          icon={<Warning size={20} weight="duotone" />}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Vencen en 7 días"
          value={data.dueSoon}
          icon={<ClockCounterClockwise size={20} weight="duotone" />}
        />
        <StorageCard
          bytes={data.storageBytes}
          hint="Documentos subidos por ti"
        />
        <Card size="sm">
          <CardContent className="px-4">
            <CompletionBar
              done={data.completion30d.done}
              created={data.completion30d.created}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card size="sm" className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Distribución de estados</CardTitle>
            <p className="text-muted-foreground text-xs">
              Tus tareas activas por estado.
            </p>
          </CardHeader>
          <CardContent className="px-4">
            <StatusDonut
              pending={data.pending}
              inProgress={data.inProgress}
              done={data.done}
            />
          </CardContent>
        </Card>

        <div className="lg:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
          <TopTasksList
            title="Tus pendientes más recientes"
            tasks={data.topPending}
            hrefBuilder={(id) => `/${slug}/tasks/${id}`}
            emptyMessage="Aún no tienes tareas pendientes asignadas."
          />
          <TopTasksList
            title="Tus tareas en curso"
            tasks={data.topInProgress}
            hrefBuilder={(id) => `/${slug}/tasks/${id}`}
            emptyMessage="Aún no tienes tareas en curso asignadas."
          />
        </div>
      </section>
    </div>
  );
}
