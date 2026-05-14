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
  UserSwitchIcon,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  type TaskStatus,
  type TaskVisibility,
} from "@/lib/db/schema/task";
import {
  claimAuthorship,
  transitionStatus,
  transitionVisibility,
} from "@/lib/tasks/actions";

type Task = {
  id: string;
  visibility: TaskVisibility;
  status: TaskStatus;
  authorId: string;
  dueAt: Date | null;
};

export function TaskDetailActions({
  task,
  currentUserId,
}: {
  task: Task;
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

  function activateTask() {
    if (!task.dueAt) {
      toast.error(
        "Define un plazo antes de activar la tarea (edita la tarea primero).",
      );
      return;
    }
    runAction(() => transitionVisibility({ taskId: task.id, to: "active" }));
  }

  const canClaim = task.authorId !== currentUserId;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3">
      {task.visibility === "draft" ? (
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

      {task.visibility === "active" ? (
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

      {task.visibility === "archived" ? (
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

      {task.status === "pending" ? (
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

      {task.status === "in_progress" ? (
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

      {task.status === "done" ? (
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

      {canClaim ? (
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
    </div>
  );
}
