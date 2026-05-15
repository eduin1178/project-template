"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { isOrgAdmin, requireOrgMember } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { task, taskAssignee, taskDocument } from "@/lib/db/schema";
import {
  deletePrivateAsset,
  getPresignedDownloadUrl,
  requireDocumentsBucket,
  uploadPrivateAsset,
} from "@/lib/storage/r2";

import {
  buildTaskDocumentKey,
  validateDocumentInput,
} from "./documents";
import { canActOnExpired, isTaskExpired } from "./expiration";
import {
  deleteDocumentSchema,
  getDocumentDownloadUrlSchema,
  type DeleteDocumentInput,
  type GetDocumentDownloadUrlInput,
} from "./schemas";

type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

const ADMIN_TASKS_PATH = "/admin/tasks";
const TASKS_PATH = "/tasks";

const PRESIGNED_TTL_SECONDS = 300;

function revalidateTaskPaths() {
  revalidatePath(ADMIN_TASKS_PATH);
  revalidatePath(TASKS_PATH);
}

async function canViewerOperateOnTask({
  taskId,
  orgId,
  viewerUserId,
  isAdmin,
}: {
  taskId: string;
  orgId: string;
  viewerUserId: string;
  isAdmin: boolean;
}): Promise<
  | {
      ok: true;
      task: {
        id: string;
        authorId: string;
        responsibleId: string | null;
        visibility: string;
        dueAt: Date | null;
      };
      isParticipant: boolean;
    }
  | { ok: false }
> {
  const [row] = await db
    .select({
      id: task.id,
      authorId: task.authorId,
      responsibleId: task.responsibleId,
      visibility: task.visibility,
      dueAt: task.dueAt,
    })
    .from(task)
    .where(and(eq(task.id, taskId), eq(task.organizationId, orgId)))
    .limit(1);
  if (!row) return { ok: false };

  if (isAdmin) {
    return {
      ok: true,
      task: { ...row, dueAt: row.dueAt ?? null },
      isParticipant: true,
    };
  }
  if (row.visibility !== "active") {
    return { ok: false };
  }
  const isAuthor = row.authorId === viewerUserId;
  const isResponsible = row.responsibleId === viewerUserId;
  let isAssignee = false;
  if (!isAuthor && !isResponsible) {
    const [assigneeRow] = await db
      .select({ userId: taskAssignee.userId })
      .from(taskAssignee)
      .where(
        and(
          eq(taskAssignee.taskId, taskId),
          eq(taskAssignee.userId, viewerUserId),
        ),
      )
      .limit(1);
    isAssignee = Boolean(assigneeRow);
  }
  const isParticipant = isAuthor || isResponsible || isAssignee;
  if (!isParticipant) return { ok: false };
  return {
    ok: true,
    task: { ...row, dueAt: row.dueAt ?? null },
    isParticipant: true,
  };
}

export async function uploadTaskDocument(
  formData: FormData,
): Promise<ActionResult<{ documentId: string }>> {
  const taskIdRaw = formData.get("taskId");
  const file = formData.get("file");
  if (typeof taskIdRaw !== "string" || taskIdRaw.length === 0) {
    return { ok: false, error: "Tarea inválida." };
  }
  if (!(file instanceof File)) {
    return { ok: false, error: "Adjunta un archivo válido." };
  }

  let ctx;
  try {
    ctx = await requireOrgMember();
  } catch {
    return {
      ok: false,
      error: "No tienes permisos para adjuntar documentos en esta tarea.",
    };
  }

  const authz = await canViewerOperateOnTask({
    taskId: taskIdRaw,
    orgId: ctx.orgId,
    viewerUserId: ctx.userId,
    isAdmin: isOrgAdmin(ctx.role),
  });
  if (!authz.ok) {
    return {
      ok: false,
      error: "No tienes permisos para adjuntar documentos en esta tarea.",
    };
  }

  if (
    isTaskExpired({ dueAt: authz.task.dueAt }) &&
    !canActOnExpired(
      { userId: ctx.userId, role: ctx.role },
      { authorId: authz.task.authorId },
    )
  ) {
    return {
      ok: false,
      error:
        "El plazo de esta tarea venció. Pide a un administrador o al autor que adjunte documentos.",
    };
  }

  const validation = validateDocumentInput({
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  });
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  const documentId = randomUUID();
  const objectUuid = randomUUID();
  const storageKey = buildTaskDocumentKey({
    organizationId: ctx.orgId,
    taskId: taskIdRaw,
    extension: validation.extension,
    uuid: objectUuid,
  });

  let bucket: string;
  try {
    bucket = requireDocumentsBucket();
  } catch (err) {
    console.error("[tasks] uploadTaskDocument: bucket no configurado", err);
    return {
      ok: false,
      error: "El almacenamiento de documentos no está configurado.",
    };
  }

  let bodyBuffer: Buffer;
  try {
    const arrayBuffer = await file.arrayBuffer();
    bodyBuffer = Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("[tasks] uploadTaskDocument: lectura de archivo falló", err);
    return { ok: false, error: "No pudimos leer el archivo." };
  }

  try {
    await uploadPrivateAsset({
      bucket,
      key: storageKey,
      body: bodyBuffer,
      contentType: file.type,
    });
  } catch (err) {
    console.error("[tasks] uploadTaskDocument: subida a R2 falló", err);
    return { ok: false, error: "No pudimos subir el archivo. Intenta de nuevo." };
  }

  try {
    await db.insert(taskDocument).values({
      id: documentId,
      taskId: taskIdRaw,
      uploaderId: ctx.userId,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storageKey,
    });
  } catch (err) {
    console.error("[tasks] uploadTaskDocument: persistencia falló", err);
    try {
      await deletePrivateAsset({ bucket, key: storageKey });
    } catch (cleanupErr) {
      console.warn(
        "[tasks] uploadTaskDocument: rollback de R2 falló",
        cleanupErr,
        { storageKey },
      );
    }
    return { ok: false, error: "No pudimos guardar el documento." };
  }

  revalidateTaskPaths();
  return { ok: true, data: { documentId } };
}

export async function getTaskDocumentDownloadUrl(
  input: GetDocumentDownloadUrlInput,
): Promise<ActionResult<{ url: string }>> {
  const parsed = getDocumentDownloadUrlSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Documento inválido." };
  }

  let ctx;
  try {
    ctx = await requireOrgMember();
  } catch {
    return {
      ok: false,
      error: "No tienes permisos para descargar este documento.",
    };
  }

  const [row] = await db
    .select({
      id: taskDocument.id,
      taskId: taskDocument.taskId,
      fileName: taskDocument.fileName,
      storageKey: taskDocument.storageKey,
      taskOrgId: task.organizationId,
    })
    .from(taskDocument)
    .innerJoin(task, eq(taskDocument.taskId, task.id))
    .where(eq(taskDocument.id, parsed.data.documentId))
    .limit(1);

  if (!row) {
    return { ok: false, error: "El documento ya no está disponible." };
  }
  if (row.taskOrgId !== ctx.orgId) {
    return {
      ok: false,
      error: "No tienes permisos para descargar este documento.",
    };
  }

  const authz = await canViewerOperateOnTask({
    taskId: row.taskId,
    orgId: ctx.orgId,
    viewerUserId: ctx.userId,
    isAdmin: isOrgAdmin(ctx.role),
  });
  if (!authz.ok) {
    return {
      ok: false,
      error: "No tienes permisos para descargar este documento.",
    };
  }

  let bucket: string;
  try {
    bucket = requireDocumentsBucket();
  } catch (err) {
    console.error("[tasks] getTaskDocumentDownloadUrl: bucket no configurado", err);
    return {
      ok: false,
      error: "El almacenamiento de documentos no está configurado.",
    };
  }

  try {
    const url = await getPresignedDownloadUrl({
      bucket,
      key: row.storageKey,
      expiresIn: PRESIGNED_TTL_SECONDS,
      downloadFilename: row.fileName,
    });
    return { ok: true, data: { url } };
  } catch (err) {
    console.error("[tasks] getTaskDocumentDownloadUrl: firmar URL falló", err);
    return { ok: false, error: "No pudimos preparar la descarga." };
  }
}

export async function deleteTaskDocument(
  input: DeleteDocumentInput,
): Promise<ActionResult> {
  const parsed = deleteDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Documento inválido." };
  }

  let ctx;
  try {
    ctx = await requireOrgMember();
  } catch {
    return {
      ok: false,
      error: "No tienes permisos para eliminar este documento.",
    };
  }

  const [row] = await db
    .select({
      id: taskDocument.id,
      taskId: taskDocument.taskId,
      uploaderId: taskDocument.uploaderId,
      storageKey: taskDocument.storageKey,
      taskAuthorId: task.authorId,
      taskOrgId: task.organizationId,
      taskDueAt: task.dueAt,
    })
    .from(taskDocument)
    .innerJoin(task, eq(taskDocument.taskId, task.id))
    .where(eq(taskDocument.id, parsed.data.documentId))
    .limit(1);

  if (!row) {
    return { ok: false, error: "El documento ya no está disponible." };
  }
  if (row.taskOrgId !== ctx.orgId) {
    return {
      ok: false,
      error: "No tienes permisos para eliminar este documento.",
    };
  }

  const isAdmin = isOrgAdmin(ctx.role);
  const isTaskAuthor = row.taskAuthorId === ctx.userId;
  const isUploader = row.uploaderId === ctx.userId;
  if (!isAdmin && !isTaskAuthor && !isUploader) {
    return {
      ok: false,
      error: "No tienes permisos para eliminar este documento.",
    };
  }

  if (
    isTaskExpired({ dueAt: row.taskDueAt ?? null }) &&
    !canActOnExpired(
      { userId: ctx.userId, role: ctx.role },
      { authorId: row.taskAuthorId },
    )
  ) {
    return {
      ok: false,
      error:
        "El plazo de esta tarea venció. Pide a un administrador o al autor que elimine este documento.",
    };
  }

  let bucket: string;
  try {
    bucket = requireDocumentsBucket();
  } catch (err) {
    console.error("[tasks] deleteTaskDocument: bucket no configurado", err);
    return {
      ok: false,
      error: "El almacenamiento de documentos no está configurado.",
    };
  }

  try {
    await deletePrivateAsset({ bucket, key: row.storageKey });
  } catch (err) {
    console.error("[tasks] deleteTaskDocument: borrado en R2 falló", err, {
      storageKey: row.storageKey,
    });
    return {
      ok: false,
      error: "No pudimos eliminar el archivo. Intenta de nuevo.",
    };
  }

  try {
    await db.delete(taskDocument).where(eq(taskDocument.id, row.id));
  } catch (err) {
    console.warn(
      "[tasks] deleteTaskDocument: blob eliminado pero fila quedó",
      err,
      { documentId: row.id, storageKey: row.storageKey },
    );
    return {
      ok: false,
      error: "El archivo se eliminó del almacenamiento, pero no pudimos actualizar la base.",
    };
  }

  revalidateTaskPaths();
  return { ok: true };
}
