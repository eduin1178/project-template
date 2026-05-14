"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
  PaperPlaneTiltIcon,
  PlayIcon,
  TrashIcon,
  UserSwitchIcon,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  type TaskStatus,
  type TaskVisibility,
} from "@/lib/db/schema/task";
import {
  claimAuthorship,
  deleteTask,
  transitionStatus,
  transitionVisibility,
} from "@/lib/tasks/actions";

import type { TaskCapabilities } from "./capabilities";

type Task = {
  id: string;
  visibility: TaskVisibility;
  status: TaskStatus;
  dueAt: Date | null;
  responsibleId: string | null;
};

export function TaskDetailActions({
  task,
  capabilities,
}: {
  task: Task;
  capabilities: TaskCapabilities;
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

  function activateTask() {
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
    runAction(() => transitionVisibility({ taskId: task.id, to: "active" }));
  }

  function onDelete() {
    if (!confirm("¿Eliminar esta tarea? Esta acción no se puede deshacer.")) {
      return;
    }
    runAction(() => deleteTask({ taskId: task.id }));
  }

  const showVisibilityButton = capabilities.canTransitionVisibility;
  const showStatusButton = capabilities.canTransitionStatus;
  const showClaim = capabilities.canClaim;
  const showDelete = capabilities.canDelete;

  if (
    !showVisibilityButton &&
    !showStatusButton &&
    !showClaim &&
    !showDelete
  ) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3">
      {showVisibilityButton && task.visibility === "draft" ? (
        <Button
          type="button"
          size="sm"
          variant="default"
          onClick={activateTask}
          disabled={isPending}
        >
          <PaperPlaneTiltIcon />
          Activar
        </Button>
      ) : null}

      {showVisibilityButton && task.visibility === "active" ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            runAction(() =>
              transitionVisibility({ taskId: task.id, to: "archived" }),
            )
          }
          disabled={isPending}
        >
          <ArchiveIcon />
          Archivar
        </Button>
      ) : null}

      {showVisibilityButton && task.visibility === "archived" ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            runAction(() =>
              transitionVisibility({ taskId: task.id, to: "active" }),
            )
          }
          disabled={isPending}
        >
          <ArrowCounterClockwiseIcon />
          Reactivar
        </Button>
      ) : null}

      {showStatusButton && task.status === "pending" ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            runAction(() =>
              transitionStatus({ taskId: task.id, to: "in_progress" }),
            )
          }
          disabled={isPending}
        >
          <PlayIcon />
          Iniciar
        </Button>
      ) : null}

      {showStatusButton && task.status === "in_progress" ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            runAction(() =>
              transitionStatus({ taskId: task.id, to: "done" }),
            )
          }
          disabled={isPending}
        >
          <CheckCircleIcon />
          Marcar como hecha
        </Button>
      ) : null}

      {showStatusButton && task.status === "done" ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            runAction(() =>
              transitionStatus({ taskId: task.id, to: "in_progress" }),
            )
          }
          disabled={isPending}
        >
          <ArrowCounterClockwiseIcon />
          Reabrir
        </Button>
      ) : null}

      {showClaim ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => runAction(() => claimAuthorship({ taskId: task.id }))}
          disabled={isPending}
        >
          <UserSwitchIcon />
          Tomar posesión
        </Button>
      ) : null}

      {showDelete ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive ml-auto"
          onClick={onDelete}
          disabled={isPending}
        >
          <TrashIcon />
          Eliminar
        </Button>
      ) : null}
    </div>
  );
}
