"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { DotsThreeVerticalIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TASK_STATUS_VALUES,
  TASK_VISIBILITY_VALUES,
  type TaskStatus,
  type TaskVisibility,
} from "@/lib/db/schema/task";
import {
  claimAuthorship,
  deleteTask,
  transitionStatus,
  transitionVisibility,
} from "@/lib/tasks/actions";

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

const VISIBILITY_ALLOWED: Record<TaskVisibility, TaskVisibility[]> = {
  draft: ["active"],
  active: ["draft", "archived"],
  archived: ["active"],
};

const STATUS_ALLOWED: Record<TaskStatus, TaskStatus[]> = {
  pending: ["in_progress"],
  in_progress: ["pending", "done"],
  done: ["pending", "in_progress"],
};

export function TaskRowActions({
  task,
  currentUserId,
}: {
  task: {
    id: string;
    visibility: TaskVisibility;
    status: TaskStatus;
    authorId: string;
    dueAt: Date | null;
    responsibleId: string | null;
  };
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function runAction(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos completar la acción.");
        return;
      }
      router.refresh();
    });
  }

  function onTransitionVisibility(to: TaskVisibility) {
    if (to === "active") {
      if (!task.dueAt) {
        toast.error(
          "Define un plazo antes de activar la tarea (edita la tarea primero).",
        );
        return;
      }
      if (!task.responsibleId) {
        toast.error("Define un responsable antes de activar la tarea.");
        return;
      }
    }
    runAction(() => transitionVisibility({ taskId: task.id, to }));
  }

  function onDelete() {
    if (!confirm("¿Eliminar esta tarea? Esta acción no se puede deshacer.")) {
      return;
    }
    runAction(() => deleteTask({ taskId: task.id }));
  }

  function onTransitionStatus(to: TaskStatus) {
    runAction(() => transitionStatus({ taskId: task.id, to }));
  }

  function onClaim() {
    runAction(() => claimAuthorship({ taskId: task.id }));
  }

  const visibilityTargets = VISIBILITY_ALLOWED[task.visibility];
  const statusTargets = STATUS_ALLOWED[task.status];
  const canClaim = task.authorId !== currentUserId;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={isPending}
          aria-label="Acciones"
        >
          <DotsThreeVerticalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Cambiar visibilidad</DropdownMenuLabel>
        {TASK_VISIBILITY_VALUES.map((v) => {
          const allowed = visibilityTargets.includes(v);
          if (v === task.visibility) return null;
          return (
            <DropdownMenuItem
              key={`vis-${v}`}
              disabled={!allowed || isPending}
              onSelect={() => onTransitionVisibility(v)}
            >
              {VISIBILITY_LABEL[v]}
              {!allowed ? (
                <span className="text-muted-foreground ml-auto text-xs">
                  bloqueada
                </span>
              ) : null}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Cambiar estado</DropdownMenuLabel>
        {TASK_STATUS_VALUES.map((s) => {
          const allowed = statusTargets.includes(s);
          if (s === task.status) return null;
          return (
            <DropdownMenuItem
              key={`st-${s}`}
              disabled={!allowed || isPending}
              onSelect={() => onTransitionStatus(s)}
            >
              {STATUS_LABEL[s]}
              {!allowed ? (
                <span className="text-muted-foreground ml-auto text-xs">
                  bloqueada
                </span>
              ) : null}
            </DropdownMenuItem>
          );
        })}

        {canClaim ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={isPending} onSelect={onClaim}>
              Tomar posesión
            </DropdownMenuItem>
          </>
        ) : null}

        {task.visibility === "draft" ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isPending}
              onSelect={onDelete}
              variant="destructive"
            >
              Eliminar tarea
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
