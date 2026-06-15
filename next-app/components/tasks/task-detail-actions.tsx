"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
  DotsThreeVerticalIcon,
  PaperPlaneTiltIcon,
  PlayIcon,
  TrashIcon,
  UserSwitchIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

function statusButtonMeta(current: TaskStatus): {
  label: string;
  Icon: PhosphorIcon;
  preset: TaskStatus;
} {
  if (current === "pending")
    return { label: "Iniciar", Icon: PlayIcon, preset: "in_progress" };
  if (current === "in_progress")
    return { label: "Marcar como hecha", Icon: CheckCircleIcon, preset: "done" };
  return { label: "Reabrir", Icon: ArrowCounterClockwiseIcon, preset: "in_progress" };
}

/**
 * Barra de acciones consolidada del detalle: acciones primarias contextuales
 * como botones (transición de estado y la transición de visibilidad primaria)
 * y el resto agrupado en un único menú de overflow. Es la ÚNICA fuente de
 * acciones del detalle: no se duplica en el header.
 */
export function TaskDetailActions({
  task,
  capabilities,
}: {
  task: Task;
  capabilities: TaskCapabilities;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

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

  const showVisibility = capabilities.canTransitionVisibility;
  const showStatus = capabilities.canChangeStatus;
  const showClaim = capabilities.canClaim;
  const showDelete = capabilities.canDelete;

  if (!showVisibility && !showStatus && !showClaim && !showDelete) {
    return null;
  }

  const statusMeta = statusButtonMeta(task.status);

  // El overflow agrupa lo que no es acción primaria: transiciones de
  // visibilidad secundarias (solo aplican cuando la tarea está `active`),
  // tomar posesión y eliminar.
  const showSecondaryVisibility = showVisibility && task.visibility === "active";
  const hasOverflow = showSecondaryVisibility || showClaim || showDelete;

  return (
    <div className="flex items-center gap-2">
      {showStatus ? (
        <ChangeStatusDialog
          taskId={task.id}
          currentStatus={task.status}
          presetStatus={statusMeta.preset}
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
        />
      ) : null}

      {showVisibility && task.visibility === "draft" ? (
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

      {showVisibility && task.visibility === "archived" ? (
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

      {showStatus ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setStatusDialogOpen(true)}
          disabled={isPending}
        >
          <statusMeta.Icon />
          {statusMeta.label}
        </Button>
      ) : null}

      {hasOverflow ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={isPending}
              aria-label="Más acciones"
            >
              <DotsThreeVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {showSecondaryVisibility ? (
              <>
                <DropdownMenuItem
                  disabled={isPending}
                  onSelect={() =>
                    runAction(() =>
                      transitionVisibility({ taskId: task.id, to: "archived" }),
                    )
                  }
                >
                  <ArchiveIcon />
                  Archivar
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isPending}
                  onSelect={() =>
                    runAction(() =>
                      transitionVisibility({ taskId: task.id, to: "draft" }),
                    )
                  }
                >
                  <ArrowCounterClockwiseIcon />
                  Volver a borrador
                </DropdownMenuItem>
              </>
            ) : null}

            {showClaim ? (
              <>
                {showSecondaryVisibility ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem
                  disabled={isPending}
                  onSelect={() =>
                    runAction(() => claimAuthorship({ taskId: task.id }))
                  }
                >
                  <UserSwitchIcon />
                  Tomar posesión
                </DropdownMenuItem>
              </>
            ) : null}

            {showDelete ? (
              <>
                {showSecondaryVisibility || showClaim ? (
                  <DropdownMenuSeparator />
                ) : null}
                <DropdownMenuItem
                  disabled={isPending}
                  variant="destructive"
                  onSelect={onDelete}
                >
                  <TrashIcon />
                  Eliminar
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
