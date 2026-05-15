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
  TASK_VISIBILITY_VALUES,
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
import { useState } from "react";

const VISIBILITY_LABEL: Record<TaskVisibility, string> = {
  draft: "Borrador",
  active: "Activa",
  archived: "Archivada",
};

const VISIBILITY_ALLOWED: Record<TaskVisibility, TaskVisibility[]> = {
  draft: ["active"],
  active: ["draft", "archived"],
  archived: ["active"],
};

export function TaskRowActions({
  task,
  capabilities,
}: {
  task: {
    id: string;
    visibility: TaskVisibility;
    status: TaskStatus;
    dueAt: Date | null;
    responsibleId: string | null;
  };
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

  function onClaim() {
    runAction(() => claimAuthorship({ taskId: task.id }));
  }

  const visibilityTargets = VISIBILITY_ALLOWED[task.visibility];

  const showVisibility = capabilities.canTransitionVisibility;
  const showStatus = capabilities.canChangeStatus;
  const showClaim = capabilities.canClaim;
  const showDelete = capabilities.canDelete;

  if (!showVisibility && !showStatus && !showClaim && !showDelete) {
    return null;
  }

  return (
    <>
    <ChangeStatusDialog
      taskId={task.id}
      currentStatus={task.status}
      open={statusDialogOpen}
      onOpenChange={setStatusDialogOpen}
    />
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
        {showVisibility ? (
          <>
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
          </>
        ) : null}

        {showStatus ? (
          <>
            {showVisibility ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              disabled={isPending}
              onSelect={(e) => {
                e.preventDefault();
                setStatusDialogOpen(true);
              }}
            >
              Cambia el estado
            </DropdownMenuItem>
          </>
        ) : null}

        {showClaim ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={isPending} onSelect={onClaim}>
              Tomar posesión
            </DropdownMenuItem>
          </>
        ) : null}

        {showDelete ? (
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
    </>
  );
}
