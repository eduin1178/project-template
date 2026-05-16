"use client";

import { useState } from "react";
import { PencilSimpleIcon } from "@phosphor-icons/react";

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
import {
  TaskChecklistAddForm,
  TaskChecklistList,
  TaskChecklistProvider,
} from "./task-checklist-panel";
import { TaskCommentsPanel } from "./task-comments-panel";
import { TaskDetailActions } from "./task-detail-actions";
import { TaskDocumentsPanel } from "./task-documents-panel";
import { TaskRowActions } from "./task-row-actions";
import { TaskTeamSummary } from "./task-team-summary";
import { UserAvatar } from "./user-avatar";

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
      <header className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-start lg:justify-between lg:gap-4 lg:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <UserAvatar
            name={task.authorName}
            email={task.authorEmail}
            image={task.authorImage}
            className="size-9 shrink-0"
          />
          <div className="min-w-0 space-y-1">
            <h2 className="text-base font-semibold leading-tight lg:text-xl">
              {task.title}
            </h2>
            <div className="text-muted-foreground text-sm">{authorLabel}</div>
            <div className="text-muted-foreground text-xs">
              Creada {formatDateLong(task.createdAt)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:flex-nowrap">
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

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b px-4 py-3 lg:px-5">
        <Badge variant={VISIBILITY_VARIANT[visibility]}>
          {VISIBILITY_LABEL[visibility]}
        </Badge>
        <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
        {capabilities.isExpired && visibility === "active" ? (
          <Badge variant="destructive">Plazo vencido</Badge>
        ) : null}
        <Separator orientation="vertical" className="mx-2 hidden h-4 lg:block" />
        <div className="text-muted-foreground basis-full text-xs lg:basis-auto">
          {task.dueAt ? (
            <>Plazo: {formatDateLong(task.dueAt)}</>
          ) : (
            <>Sin plazo definido</>
          )}
        </div>
      </div>

      {capabilities.isExpired && visibility === "active" && !capabilities.canChangeStatus ? (
        <div className="border-b bg-muted/40 px-5 py-2 text-xs text-muted-foreground">
          Esta tarea venció. Solo puedes comentar; pide a un administrador o al
          autor que extienda el plazo o cambie el estado.
        </div>
      ) : null}

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
          <TabsTrigger value="checklist">
            Checklist
            {checklistItems.length > 0 ? ` (${checklistItems.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documentos
            {documents.length > 0 ? ` (${documents.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="comments">
            Comentarios
            {comments.filter((c) => c.deletedAt === null).length > 0
              ? ` (${comments.filter((c) => c.deletedAt === null).length})`
              : ""}
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
        </TabsContent>
        <TabsContent
          value="checklist"
          className="mt-0 flex min-h-0 flex-1 flex-col"
        >
          <TaskChecklistProvider
            taskId={task.id}
            items={checklistItems}
            canManageChecklist={capabilities.canManageChecklist}
          >
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <TaskChecklistList />
              {checklistItems.length === 0 && !capabilities.canManageChecklist ? (
                <p className="text-muted-foreground text-sm italic">
                  Esta tarea no tiene checklist.
                </p>
              ) : null}
            </div>
            {capabilities.canManageChecklist ? (
              <div className="bg-background border-t p-3">
                <TaskChecklistAddForm />
              </div>
            ) : null}
          </TaskChecklistProvider>
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
