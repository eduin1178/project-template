"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon, XIcon } from "@phosphor-icons/react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskVisibility } from "@/lib/db/schema/task";
import {
  addAssignee,
  clearResponsible,
  removeAssignee,
  setResponsible,
} from "@/lib/tasks/actions";
import type { OrgMemberOption, TaskListItem } from "@/lib/tasks/queries";

function personLabel(name: string | null, email: string | null): string {
  return name?.trim() || email?.trim() || "Sin nombre";
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

const NONE_VALUE = "__none__";

export function TaskAssigneesPanel({
  task,
  members,
}: {
  task: TaskListItem;
  members: OrgMemberOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingAssigneeId, setPendingAssigneeId] = useState<string>("");

  const visibility = task.visibility as TaskVisibility;
  const assigneeIds = useMemo(
    () => new Set(task.assignees.map((a) => a.userId)),
    [task.assignees],
  );

  const responsibleOptions = members;
  const assigneeOptions = useMemo(
    () =>
      members.filter(
        (m) => m.userId !== task.responsibleId && !assigneeIds.has(m.userId),
      ),
    [members, task.responsibleId, assigneeIds],
  );

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

  function onChangeResponsible(value: string) {
    if (value === NONE_VALUE) {
      if (visibility === "active") {
        toast.error("No puedes quitar el responsable de una tarea activa.");
        return;
      }
      runAction(() => clearResponsible({ taskId: task.id }));
      return;
    }
    runAction(() => setResponsible({ taskId: task.id, userId: value }));
  }

  function onAddAssignee() {
    if (!pendingAssigneeId) return;
    const userId = pendingAssigneeId;
    setPendingAssigneeId("");
    runAction(() => addAssignee({ taskId: task.id, userId }));
  }

  function onRemoveAssignee(userId: string) {
    runAction(() => removeAssignee({ taskId: task.id, userId }));
  }

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Responsable</h3>
          {task.responsibleId ? (
            <Badge variant="default">Asignado</Badge>
          ) : (
            <Badge variant="outline">Sin asignar</Badge>
          )}
        </div>
        <Select
          value={task.responsibleId ?? NONE_VALUE}
          onValueChange={onChangeResponsible}
          disabled={isPending}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un responsable" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE} disabled={visibility === "active"}>
              Sin responsable
            </SelectItem>
            {responsibleOptions.map((m) => (
              <SelectItem key={m.userId} value={m.userId}>
                {personLabel(m.name, m.email)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {visibility === "active" ? (
          <p className="text-muted-foreground text-xs">
            Una tarea activa debe tener responsable. Para quitarlo, archiva o
            vuelve a borrador primero.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Equipo de apoyo</h3>
        {task.assignees.length === 0 ? (
          <p className="text-muted-foreground text-xs italic">
            Sin equipo de apoyo asignado.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {task.assignees.map((a) => (
              <li
                key={a.userId}
                className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm"
              >
                <span className="inline-flex items-center gap-2">
                  <Avatar className="size-6">
                    <AvatarFallback className="text-xs">
                      {personInitials(a.name, a.email)}
                    </AvatarFallback>
                  </Avatar>
                  {personLabel(a.name, a.email)}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Quitar a ${personLabel(a.name, a.email)}`}
                  disabled={isPending}
                  onClick={() => onRemoveAssignee(a.userId)}
                >
                  <XIcon />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-2">
          <Select
            value={pendingAssigneeId}
            onValueChange={setPendingAssigneeId}
            disabled={isPending || assigneeOptions.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Agregar al equipo de apoyo" />
            </SelectTrigger>
            <SelectContent>
              {assigneeOptions.map((m) => (
                <SelectItem key={m.userId} value={m.userId}>
                  {personLabel(m.name, m.email)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            onClick={onAddAssignee}
            disabled={isPending || !pendingAssigneeId}
          >
            <PlusIcon />
            Agregar
          </Button>
        </div>
      </div>
    </section>
  );
}
