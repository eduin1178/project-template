"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeftIcon, PencilSimpleIcon } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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

function SectionCard({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3 lg:px-5">
        <h2 className="text-base font-semibold">{title}</h2>
        {typeof count === "number" && count > 0 ? (
          <Badge variant="secondary">{count}</Badge>
        ) : null}
      </header>
      {children}
    </section>
  );
}

export function TaskFullPageDetail({
  task,
  members,
  capabilities,
  comments,
  documents,
  checklistItems,
  backHref,
}: {
  task: TaskListItem;
  members: OrgMemberOption[];
  capabilities: TaskCapabilities;
  comments: TaskCommentView[];
  documents: TaskDocumentView[];
  checklistItems: TaskChecklistItemView[];
  backHref: string;
}) {
  const visibility = task.visibility as TaskVisibility;
  const status = task.status as TaskStatus;
  const authorLabel = personLabel(task.authorName, task.authorEmail);
  const activeCommentsCount = comments.filter((c) => c.deletedAt === null).length;
  const [editOpen, setEditOpen] = useState(false);

  const showEdit =
    capabilities.canEditContent || capabilities.canEditDueAt;

  return (
    <div className="space-y-5 pb-8">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href={backHref}>
            <ArrowLeftIcon />
            Volver al listado
          </Link>
        </Button>
      </div>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <header className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between lg:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <UserAvatar
              name={task.authorName}
              email={task.authorEmail}
              image={task.authorImage}
              className="size-10 shrink-0"
            />
            <div className="min-w-0 space-y-1">
              <h1 className="text-xl font-semibold leading-tight tracking-tight lg:text-2xl">
                {task.title}
              </h1>
              <div className="text-muted-foreground text-sm">
                Creada por {authorLabel}
              </div>
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
                <Separator orientation="vertical" className="hidden h-7 lg:block" />
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
            <Separator orientation="vertical" className="hidden h-7 lg:block" />
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

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t px-4 py-3 lg:px-5">
          <Badge variant={VISIBILITY_VARIANT[visibility]}>
            {VISIBILITY_LABEL[visibility]}
          </Badge>
          <Badge variant={STATUS_VARIANT[status]}>
            {STATUS_LABEL[status]}
          </Badge>
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

        {capabilities.isExpired &&
        visibility === "active" &&
        !capabilities.canChangeStatus ? (
          <div className="border-t bg-muted/40 px-5 py-2 text-xs text-muted-foreground">
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
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="space-y-5">
          <SectionCard title="Descripción">
            <div className="px-4 py-5 lg:px-5">
              {task.description ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {task.description}
                </p>
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  Esta tarea no tiene descripción.
                </p>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Checklist" count={checklistItems.length}>
            <TaskChecklistProvider
              taskId={task.id}
              items={checklistItems}
              canManageChecklist={capabilities.canManageChecklist}
            >
              <div className="px-4 py-4 lg:px-5">
                <TaskChecklistList />
                {checklistItems.length === 0 &&
                !capabilities.canManageChecklist ? (
                  <p className="text-muted-foreground text-sm italic">
                    Esta tarea no tiene checklist.
                  </p>
                ) : null}
              </div>
              {capabilities.canManageChecklist ? (
                <div className="border-t bg-background p-3">
                  <TaskChecklistAddForm />
                </div>
              ) : null}
            </TaskChecklistProvider>
          </SectionCard>

          <SectionCard title="Documentos adjuntos" count={documents.length}>
            <div className="h-[28rem]">
              <TaskDocumentsPanel
                taskId={task.id}
                documents={documents}
                canUploadDocument={capabilities.canUploadDocument}
              />
            </div>
          </SectionCard>
        </div>

        <aside className="min-w-0">
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm xl:sticky xl:top-4">
            <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <h2 className="text-base font-semibold">Comentarios</h2>
              {activeCommentsCount > 0 ? (
                <Badge variant="secondary">{activeCommentsCount}</Badge>
              ) : null}
            </header>
            <div className="h-[36rem] xl:h-[calc(100vh-13rem)] xl:min-h-[32rem]">
              <TaskCommentsPanel
                taskId={task.id}
                comments={comments}
                canComment={capabilities.canComment}
              />
            </div>
          </div>
        </aside>
      </div>

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
