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
  transitionVisibility,
} from "@/lib/tasks/actions";

import type { TaskCapabilities } from "./capabilities";
import { ChangeStatusDialog } from "./change-status-dialog";

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
  const showStatusButton = capabilities.canChangeStatus;
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

  function presetForStatus(current: TaskStatus): TaskStatus {
    if (current === "pending") return "in_progress";
    if (current === "in_progress") return "done";
    return "in_progress";
  }

  function statusButtonLabel(current: TaskStatus) {
    if (current === "pending")
      return { label: "Iniciar", Icon: PlayIcon };
    if (current === "in_progress")
      return { label: "Marcar como hecha", Icon: CheckCircleIcon };
    return { label: "Reabrir", Icon: ArrowCounterClockwiseIcon };
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

      {showStatusButton ? (
        <ChangeStatusDialog
          taskId={task.id}
          currentStatus={task.status}
          presetStatus={presetForStatus(task.status)}
          trigger={
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
            >
              {(() => {
                const { Icon } = statusButtonLabel(task.status);
                return <Icon />;
              })()}
              {statusButtonLabel(task.status).label}
            </Button>
          }
        />
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
