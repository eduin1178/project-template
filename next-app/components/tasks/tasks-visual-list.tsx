"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CalendarBlankIcon,
  CheckCircleIcon,
  ClockIcon,
  SpinnerIcon,
  UserCircleIcon,
  WarningCircleIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  TASK_STATUS_VALUES,
  type TaskStatus,
  type TaskVisibility,
} from "@/lib/db/schema/task";
import type { TaskListItem } from "@/lib/tasks/queries";
import type { TaskListViewMode } from "@/lib/tasks/route-data";
import { cn } from "@/lib/utils";

const VISIBILITY_LABEL: Record<TaskVisibility, string> = {
  draft: "Borrador",
  active: "Activa",
  archived: "Archivada",
};

const STATUS_META: Record<
  TaskStatus,
  { label: string; icon: PhosphorIcon; empty: string }
> = {
  pending: {
    label: "Pendiente",
    icon: ClockIcon,
    empty: "No hay tareas pendientes con estos filtros.",
  },
  in_progress: {
    label: "En curso",
    icon: SpinnerIcon,
    empty: "No hay tareas en curso con estos filtros.",
  },
  done: {
    label: "Hecha",
    icon: CheckCircleIcon,
    empty: "No hay tareas hechas con estos filtros.",
  },
};

const STATUS_VARIANT: Record<
  TaskStatus,
  "secondary" | "default" | "outline"
> = {
  pending: "outline",
  in_progress: "default",
  done: "secondary",
};

const VISIBILITY_VARIANT: Record<
  TaskVisibility,
  "secondary" | "default" | "outline"
> = {
  draft: "outline",
  active: "default",
  archived: "secondary",
};

function asDate(date: Date | string): Date {
  return date instanceof Date ? date : new Date(date);
}

function personInitials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "";
  if (!source) return "??";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function personLabel(name: string | null, email: string | null): string {
  return name?.trim() || email?.trim() || "Sin nombre";
}

function formatDueDate(date: Date): string {
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function isExpired(task: TaskListItem): boolean {
  if (!task.dueAt || task.visibility !== "active") return false;
  return asDate(task.dueAt).getTime() <= Date.now();
}

function buildTaskHref({
  basePath,
  taskId,
  searchParams,
}: {
  basePath: string;
  taskId: string;
  searchParams: URLSearchParams;
}): string {
  const params = new URLSearchParams(searchParams.toString());
  params.delete("taskId");
  const qs = params.toString();
  return `${basePath}/${taskId}${qs ? `?${qs}` : ""}`;
}

function TaskVisualCard({
  task,
  basePath,
  compact = false,
}: {
  task: TaskListItem;
  basePath: string;
  compact?: boolean;
}) {
  const searchParams = useSearchParams();
  const status = task.status as TaskStatus;
  const visibility = task.visibility as TaskVisibility;
  const expired = isExpired(task);
  const responsibleLabel = task.responsibleId
    ? personLabel(task.responsibleName, task.responsibleEmail)
    : "Sin responsable";

  return (
    <Link
      href={buildTaskHref({ basePath, taskId: task.id, searchParams })}
      className={cn(
        "border-border bg-card hover:border-primary/50 hover:shadow-md focus-visible:border-ring focus-visible:ring-ring/40 block rounded-xl border p-4 shadow-sm transition-all outline-none focus-visible:ring-[3px]",
        expired && "border-destructive/30 bg-destructive/5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
            {task.title}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={STATUS_VARIANT[status]}>
              {STATUS_META[status].label}
            </Badge>
            <Badge variant={VISIBILITY_VARIANT[visibility]}>
              {VISIBILITY_LABEL[visibility]}
            </Badge>
            {expired ? (
              <Badge variant="destructive">
                <WarningCircleIcon />
                Vencida
              </Badge>
            ) : null}
          </div>
        </div>
        <Avatar className="size-8 shrink-0">
          {task.responsibleImage ? (
            <AvatarImage src={task.responsibleImage} alt={responsibleLabel} />
          ) : null}
          <AvatarFallback className="text-[10px]">
            {personInitials(task.responsibleName, task.responsibleEmail)}
          </AvatarFallback>
        </Avatar>
      </div>

      {task.description ? (
        <p
          className={cn(
            "text-muted-foreground mt-3 text-sm leading-relaxed",
            compact ? "line-clamp-2" : "line-clamp-3",
          )}
        >
          {task.description}
        </p>
      ) : null}

      <div className="text-muted-foreground mt-4 grid gap-2 text-xs">
        <div className="flex items-center gap-2">
          <CalendarBlankIcon className="size-4 shrink-0" aria-hidden />
          <span>
            {task.dueAt ? `Vence ${formatDueDate(asDate(task.dueAt))}` : "Sin plazo"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <UserCircleIcon className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{responsibleLabel}</span>
        </div>
      </div>
    </Link>
  );
}

function BoardView({
  tasks,
  status,
  basePath,
}: {
  tasks: TaskListItem[];
  status: TaskStatus[];
  basePath: string;
}) {
  const columns = status.length > 0 ? status : [...TASK_STATUS_VALUES];

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {columns.map((s) => {
        const meta = STATUS_META[s];
        const Icon = meta.icon;
        const items = tasks.filter((task) => task.status === s);
        return (
          <section
            key={s}
            className="border-border bg-muted/20 min-w-0 rounded-2xl border"
          >
            <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <Icon className="text-muted-foreground size-4" aria-hidden />
                <h2 className="text-sm font-semibold">{meta.label}</h2>
              </div>
              <Badge variant="secondary">{items.length}</Badge>
            </header>
            <div className="space-y-3 p-3">
              {items.length > 0 ? (
                items.map((task) => (
                  <TaskVisualCard
                    key={task.id}
                    task={task}
                    basePath={basePath}
                    compact
                  />
                ))
              ) : (
                <div className="text-muted-foreground rounded-xl border border-dashed bg-background/60 px-4 py-8 text-center text-sm">
                  {meta.empty}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function CardsView({
  tasks,
  basePath,
}: {
  tasks: TaskListItem[];
  basePath: string;
}) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        title="Sin tareas con estos filtros"
        description="Ajusta los filtros para encontrar otras tareas."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {tasks.map((task) => (
        <TaskVisualCard key={task.id} task={task} basePath={basePath} />
      ))}
    </div>
  );
}

export function TasksVisualList({
  tasks,
  status,
  basePath,
  viewMode,
}: {
  tasks: TaskListItem[];
  status: TaskStatus[];
  basePath: string;
  viewMode: TaskListViewMode;
}) {
  return viewMode === "cards" ? (
    <CardsView tasks={tasks} basePath={basePath} />
  ) : (
    <BoardView tasks={tasks} status={status} basePath={basePath} />
  );
}
