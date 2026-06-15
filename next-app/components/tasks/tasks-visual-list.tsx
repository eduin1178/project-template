"use client";

import { useRef, useState, useTransition, type CSSProperties } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
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
import { changeTaskStatus } from "@/lib/tasks/actions";
import { isStatusTransitionAllowed } from "@/lib/tasks/transitions";
import { cn } from "@/lib/utils";

import { toast } from "sonner";

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

function isTaskStatus(value: unknown): value is TaskStatus {
  return TASK_STATUS_VALUES.includes(value as TaskStatus);
}

function DraggableTaskVisualCard({
  task,
  basePath,
  draggedTaskIdRef,
}: {
  task: TaskListItem;
  basePath: string;
  draggedTaskIdRef: { current: string | null };
}) {
  const status = task.status as TaskStatus;
  const visibility = task.visibility as TaskVisibility;
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: {
        taskId: task.id,
        status,
        visibility,
      },
    });

  const style: CSSProperties | undefined = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 20 : undefined,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("touch-none", isDragging && "opacity-60")}
      {...attributes}
      {...listeners}
      onClickCapture={(e) => {
        if (draggedTaskIdRef.current === task.id) {
          draggedTaskIdRef.current = null;
          e.stopPropagation();
          e.preventDefault();
        }
      }}
    >
      <TaskVisualCard task={task} basePath={basePath} compact />
    </div>
  );
}

function BoardColumn({
  columnStatus,
  tasks,
  basePath,
  draggedTaskIdRef,
}: {
  columnStatus: TaskStatus;
  tasks: TaskListItem[];
  basePath: string;
  draggedTaskIdRef: { current: string | null };
}) {
  const meta = STATUS_META[columnStatus];
  const Icon = meta.icon;
  const { setNodeRef, isOver } = useDroppable({
    id: columnStatus,
    data: { status: columnStatus },
  });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "border-border bg-muted/20 min-w-0 rounded-2xl border transition-colors",
        isOver && "border-primary/60 bg-primary/5",
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="text-muted-foreground size-4" aria-hidden />
          <h2 className="text-sm font-semibold">{meta.label}</h2>
        </div>
        <Badge variant="secondary">{tasks.length}</Badge>
      </header>
      <div className="space-y-3 p-3">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <DraggableTaskVisualCard
              key={task.id}
              task={task}
              basePath={basePath}
              draggedTaskIdRef={draggedTaskIdRef}
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
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor),
  );
  // Copia local para aplicar el cambio de estado de forma optimista: la card
  // salta de columna al instante. Se resincroniza cuando el servidor revalida
  // y trae nuevas props (cambio de filtros, orden o reconciliación post-acción).
  const [localTasks, setLocalTasks] = useState(tasks);
  const [syncedTasks, setSyncedTasks] = useState(tasks);
  const draggedTaskIdRef = useRef<string | null>(null);
  const [, startTransition] = useTransition();

  // Resincroniza la copia local cuando el servidor trae nuevas props (cambio de
  // filtros, orden o reconciliación post-acción). Patrón recomendado de React:
  // ajustar estado durante el render, sin efecto.
  if (tasks !== syncedTasks) {
    setSyncedTasks(tasks);
    setLocalTasks(tasks);
  }

  function onDragStart(event: DragStartEvent) {
    draggedTaskIdRef.current = event.active.id as string;
  }

  function onDragEnd(event: DragEndEvent) {
    // Always clear the drag ref after a short delay. The post-drag click
    // handler clears it immediately; this is a safety net for cancelled
    // drags where no click fires.
    setTimeout(() => {
      draggedTaskIdRef.current = null;
    }, 300);

    const { active, over } = event;
    if (!over) return;

    const from = active.data.current?.status;
    const to = over.data.current?.status ?? over.id;
    const taskId = active.data.current?.taskId;
    const visibility = active.data.current?.visibility;

    if (!isTaskStatus(from) || !isTaskStatus(to) || typeof taskId !== "string") {
      return;
    }
    if (from === to) return;
    if (!isStatusTransitionAllowed(from, to)) {
      toast.error("Transición de estado no permitida.");
      return;
    }
    if (visibility !== "active") {
      toast.error("Solo puedes cambiar el estado de una tarea activa.");
      return;
    }

    // Actualización optimista: mover la card a la columna destino de inmediato.
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: to } : t)),
    );

    startTransition(async () => {
      const result = await changeTaskStatus({ taskId, newStatus: to });
      if (!result.ok) {
        // Revertir la card a su columna previa y avisar.
        setLocalTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: from } : t)),
        );
        toast.error(result.error);
      }
    });
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="grid gap-4 xl:grid-cols-3">
        {columns.map((s) => {
          const items = localTasks.filter((task) => task.status === s);
          return (
            <BoardColumn
              key={s}
              columnStatus={s}
              tasks={items}
              basePath={basePath}
              draggedTaskIdRef={draggedTaskIdRef}
            />
          );
        })}
      </div>
    </DndContext>
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
