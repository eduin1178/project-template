import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  type TaskStatus,
  type TaskVisibility,
} from "@/lib/db/schema/task";
import type { TaskListItem } from "@/lib/tasks/queries";

import { TaskCommentsPlaceholder } from "./task-comments-placeholder";
import { TaskDetailActions } from "./task-detail-actions";
import { TaskRowActions } from "./task-row-actions";

const VISIBILITY_LABEL: Record<TaskVisibility, string> = {
  draft: "Borrador",
  active: "Activa",
  archived: "Archivada",
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Pendiente",
  in_progress: "En curso",
  done: "Hecha",
};

const VISIBILITY_VARIANT: Record<
  TaskVisibility,
  "secondary" | "default" | "outline"
> = {
  draft: "outline",
  active: "default",
  archived: "secondary",
};

const STATUS_VARIANT: Record<
  TaskStatus,
  "secondary" | "default" | "outline"
> = {
  pending: "outline",
  in_progress: "default",
  done: "secondary",
};

function formatDateLong(date: Date): string {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

function authorInitials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "";
  if (!source) return "??";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function TaskDetailPane({
  task,
  currentUserId,
}: {
  task: TaskListItem;
  currentUserId: string;
}) {
  const visibility = task.visibility as TaskVisibility;
  const status = task.status as TaskStatus;
  const authorLabel = task.authorName ?? task.authorEmail ?? "Sin autor";

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between gap-3 border-b p-5">
        <div className="flex items-start gap-3">
          <Avatar className="size-9">
            <AvatarFallback>
              {authorInitials(task.authorName, task.authorEmail)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold leading-tight">
              {task.title}
            </h2>
            <div className="text-muted-foreground text-sm">{authorLabel}</div>
            <div className="text-muted-foreground text-xs">
              Creada {formatDateLong(task.createdAt)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TaskRowActions
            task={{
              id: task.id,
              visibility,
              status,
              authorId: task.authorId,
              dueAt: task.dueAt,
            }}
            currentUserId={currentUserId}
          />
        </div>
      </header>

      <div className="flex items-center gap-2 border-b px-5 py-3">
        <Badge variant={VISIBILITY_VARIANT[visibility]}>
          {VISIBILITY_LABEL[visibility]}
        </Badge>
        <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
        <Separator orientation="vertical" className="mx-2 h-4" />
        <div className="text-muted-foreground text-xs">
          {task.dueAt ? (
            <>Plazo: {formatDateLong(task.dueAt)}</>
          ) : (
            <>Sin plazo definido</>
          )}
        </div>
      </div>

      <TaskDetailActions
        task={{
          id: task.id,
          visibility,
          status,
          authorId: task.authorId,
          dueAt: task.dueAt,
        }}
        currentUserId={currentUserId}
      />

      <div className="flex-1 overflow-y-auto px-5 py-6">
        {task.description ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {task.description}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm italic">
            Esta tarea no tiene descripción.
          </p>
        )}
      </div>

      <TaskCommentsPlaceholder authorLabel={authorLabel} />
    </div>
  );
}
