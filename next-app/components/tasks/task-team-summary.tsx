"use client";

import { useState } from "react";
import { PencilSimpleIcon } from "@phosphor-icons/react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { OrgMemberOption, TaskListItem } from "@/lib/tasks/queries";

import { TaskAssigneesPanel } from "./task-assignees-panel";

const MAX_VISIBLE = 4;

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

type TeamMember = {
  userId: string;
  name: string | null;
  email: string | null;
  role: "responsible" | "assignee";
};

function buildTeamList(task: TaskListItem): TeamMember[] {
  const list: TeamMember[] = [];
  if (task.responsibleId) {
    list.push({
      userId: task.responsibleId,
      name: task.responsibleName,
      email: task.responsibleEmail,
      role: "responsible",
    });
  }
  for (const a of task.assignees) {
    list.push({
      userId: a.userId,
      name: a.name,
      email: a.email,
      role: "assignee",
    });
  }
  return list;
}

export function TaskTeamSummary({
  task,
  members,
}: {
  task: TaskListItem;
  members: OrgMemberOption[];
}) {
  const [open, setOpen] = useState(false);
  const team = buildTeamList(task);
  const visible = team.slice(0, MAX_VISIBLE);
  const overflow = team.length - visible.length;

  return (
    <div className="flex items-center gap-1.5">
      {team.length === 0 ? (
        <span className="text-muted-foreground text-xs italic">Sin equipo</span>
      ) : (
        <div className="flex -space-x-2">
          {visible.map((m) => (
            <Tooltip key={m.userId}>
              <TooltipTrigger asChild>
                <Avatar
                  className={cn(
                    "ring-background size-7 ring-2",
                    m.role === "responsible" && "ring-primary",
                  )}
                >
                  <AvatarFallback className="text-[10px]">
                    {personInitials(m.name, m.email)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs font-medium">
                  {personLabel(m.name, m.email)}
                </p>
                <p className="text-muted-foreground text-[10px]">
                  {m.role === "responsible" ? "Responsable" : "Equipo de apoyo"}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
          {overflow > 0 ? (
            <Avatar className="ring-background bg-muted size-7 ring-2">
              <AvatarFallback className="text-[10px]">
                +{overflow}
              </AvatarFallback>
            </Avatar>
          ) : null}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7"
                aria-label="Editar equipo"
              >
                <PencilSimpleIcon />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Editar equipo</TooltipContent>
        </Tooltip>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Equipo de la tarea</DialogTitle>
            <DialogDescription>
              Define quién es responsable y quiénes forman el equipo de apoyo.
            </DialogDescription>
          </DialogHeader>
          <TaskAssigneesPanel task={task} members={members} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
