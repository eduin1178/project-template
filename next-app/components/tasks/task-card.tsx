import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type {
  TaskStatus,
  TaskVisibility,
} from "@/lib/db/schema/task";
import type { TaskListItem } from "@/lib/tasks/queries";
import { cn } from "@/lib/utils";

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

function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
  }).format(date);
}

export function TaskCard({ task, className }: { task: TaskListItem; className?: string }) {
  const visibility = task.visibility as TaskVisibility;
  const status = task.status as TaskStatus;
  const responsibleLabel = task.responsibleId
    ? personLabel(task.responsibleName, task.responsibleEmail)
    : null;

  return (
    <article
      className={cn(
        "border-border bg-card rounded-lg border p-4 shadow-sm",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold leading-tight">{task.title}</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Autor: {personLabel(task.authorName, task.authorEmail)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <Badge variant={VISIBILITY_VARIANT[visibility]}>
            {VISIBILITY_LABEL[visibility]}
          </Badge>
          <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
        </div>
      </header>

      {task.description ? (
        <p className="text-muted-foreground mt-3 line-clamp-3 text-sm">
          {task.description}
        </p>
      ) : null}

      <dl className="mt-4 grid gap-2 text-xs">
        <div className="flex items-center gap-2">
          <dt className="text-muted-foreground w-24 shrink-0">Plazo</dt>
          <dd>{task.dueAt ? formatDateShort(task.dueAt) : "Sin plazo"}</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="text-muted-foreground w-24 shrink-0">Responsable</dt>
          <dd>
            {responsibleLabel ? (
              <span className="inline-flex items-center gap-2">
                <Avatar className="size-5">
                  <AvatarFallback className="text-[10px]">
                    {personInitials(task.responsibleName, task.responsibleEmail)}
                  </AvatarFallback>
                </Avatar>
                {responsibleLabel}
              </span>
            ) : (
              <span className="text-muted-foreground italic">Sin asignar</span>
            )}
          </dd>
        </div>
        {task.assignees.length > 0 ? (
          <div className="flex items-start gap-2">
            <dt className="text-muted-foreground w-24 shrink-0">Apoyo</dt>
            <dd className="flex flex-wrap gap-1">
              {task.assignees.map((a) => (
                <span
                  key={a.userId}
                  className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                >
                  <Avatar className="size-4">
                    <AvatarFallback className="text-[9px]">
                      {personInitials(a.name, a.email)}
                    </AvatarFallback>
                  </Avatar>
                  {personLabel(a.name, a.email)}
                </span>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}
