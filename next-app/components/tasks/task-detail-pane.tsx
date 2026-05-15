"use client";

import { useState } from "react";
import { PencilSimpleIcon } from "@phosphor-icons/react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type TaskStatus,
  type TaskVisibility,
} from "@/lib/db/schema/task";
import type {
  OrgMemberOption,
  TaskChecklistItemView,
  TaskCommentView,
  TaskDocumentView,
  TaskListItem,
} from "@/lib/tasks/queries";

import type { TaskCapabilities } from "./capabilities";
import { EditTaskDialog } from "./edit-task-dialog";
import { TaskChecklistPanel } from "./task-checklist-panel";
import { TaskCommentsPanel } from "./task-comments-panel";
import { TaskDetailActions } from "./task-detail-actions";
import { TaskDocumentsPanel } from "./task-documents-panel";
import { TaskRowActions } from "./task-row-actions";
import { TaskTeamSummary } from "./task-team-summary";

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

export function TaskDetailPane({
  task,
  members,
  capabilities,
  comments,
  documents,
  checklistItems,
}: {
  task: TaskListItem;
  members: OrgMemberOption[];
  capabilities: TaskCapabilities;
  comments: TaskCommentView[];
  documents: TaskDocumentView[];
  checklistItems: TaskChecklistItemView[];
}) {
  const visibility = task.visibility as TaskVisibility;
  const status = task.status as TaskStatus;
  const authorLabel = personLabel(task.authorName, task.authorEmail);
  const [editOpen, setEditOpen] = useState(false);

  const showEdit =
    capabilities.canEditContent || capabilities.canEditDueAt;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between gap-4 border-b p-5">
        <div className="flex items-start gap-3">
          <Avatar className="size-9">
            <AvatarFallback>
              {personInitials(task.authorName, task.authorEmail)}
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

        <div className="flex shrink-0 items-center gap-2">
          <TaskTeamSummary
            task={task}
            members={members}
            canManageTeam={capabilities.canManageTeam}
          />
          {showEdit ? (
            <>
              <Separator orientation="vertical" className="h-7" />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setEditOpen(true)}
              >
                <PencilSimpleIcon />
                Editar
              </Button>
            </>
          ) : null}
          <Separator orientation="vertical" className="h-7" />
          <TaskRowActions
            task={{
              id: task.id,
              visibility,
              status,
              dueAt: task.dueAt,
              responsibleId: task.responsibleId,
            }}
            capabilities={capabilities}
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
          dueAt: task.dueAt,
          responsibleId: task.responsibleId,
        }}
        capabilities={capabilities}
      />

      <Tabs
        defaultValue="detail"
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <TabsList className="mx-5 mt-3 w-fit">
          <TabsTrigger value="detail">Detalle</TabsTrigger>
          <TabsTrigger value="comments">
            Comentarios
            {comments.filter((c) => c.deletedAt === null).length > 0
              ? ` (${comments.filter((c) => c.deletedAt === null).length})`
              : ""}
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documentos
            {documents.length > 0 ? ` (${documents.length})` : ""}
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="detail"
          className="mt-0 flex-1 overflow-y-auto px-5 py-6"
        >
          {task.description ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {task.description}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm italic">
              Esta tarea no tiene descripción.
            </p>
          )}
          <TaskChecklistPanel
            taskId={task.id}
            items={checklistItems}
            canManageChecklist={capabilities.canManageChecklist}
          />
        </TabsContent>
        <TabsContent
          value="comments"
          className="mt-0 flex min-h-0 flex-1 flex-col"
        >
          <TaskCommentsPanel
            taskId={task.id}
            comments={comments}
            canComment={capabilities.canComment}
          />
        </TabsContent>
        <TabsContent
          value="documents"
          className="mt-0 flex min-h-0 flex-1 flex-col"
        >
          <TaskDocumentsPanel
            taskId={task.id}
            documents={documents}
            canUploadDocument={capabilities.canUploadDocument}
          />
        </TabsContent>
      </Tabs>

      {showEdit ? (
        <EditTaskDialog
          task={{
            id: task.id,
            title: task.title,
            description: task.description,
            dueAt: task.dueAt,
            visibility,
          }}
          capabilities={{
            canEditContent: capabilities.canEditContent,
            canEditDueAt: capabilities.canEditDueAt,
          }}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      ) : null}
    </div>
  );
}
