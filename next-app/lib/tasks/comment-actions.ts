"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { isOrgAdmin, requireOrgMember } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { task, taskComment, user } from "@/lib/db/schema";

import { isWithinEditWindow } from "./comments";
import { canActOnExpired, isTaskExpired } from "./expiration";
import { getTaskByIdForViewer } from "./queries";
import {
  createCommentSchema,
  deleteCommentSchema,
  type CreateCommentInput,
  type DeleteCommentInput,
} from "./schemas";

type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

function firstError(message: unknown): string {
  return typeof message === "string" && message.length > 0
    ? message
    : "Datos inválidos.";
}

function revalidateTaskPaths() {
  revalidatePath("/", "layout");
}

export async function createComment(
  input: CreateCommentInput,
): Promise<ActionResult<{ commentId: string }>> {
  const parsed = createCommentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error.issues[0]?.message) };
  }

  let ctx;
  try {
    ctx = await requireOrgMember();
  } catch {
    return {
      ok: false,
      error: "No tienes permisos para comentar en esta tarea.",
    };
  }

  const visible = await getTaskByIdForViewer({
    orgId: ctx.orgId,
    taskId: parsed.data.taskId,
    viewerUserId: ctx.userId,
    isAdmin: isOrgAdmin(ctx.role),
  });
  if (!visible) {
    return {
      ok: false,
      error: "No tienes permisos para comentar en esta tarea.",
    };
  }

  const commentId = randomUUID();
  try {
    await db.insert(taskComment).values({
      id: commentId,
      taskId: parsed.data.taskId,
      authorId: ctx.userId,
      body: parsed.data.body,
    });
  } catch (err) {
    console.error("[tasks] createComment falló", err);
    return { ok: false, error: "No pudimos guardar tu comentario." };
  }

  revalidateTaskPaths();
  return { ok: true, data: { commentId } };
}

export async function deleteComment(
  input: DeleteCommentInput,
): Promise<ActionResult> {
  const parsed = deleteCommentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error.issues[0]?.message) };
  }

  let ctx;
  try {
    ctx = await requireOrgMember();
  } catch {
    return {
      ok: false,
      error: "No tienes permisos para eliminar este comentario.",
    };
  }

  const [row] = await db
    .select({
      id: taskComment.id,
      taskId: taskComment.taskId,
      authorId: taskComment.authorId,
      createdAt: taskComment.createdAt,
      deletedAt: taskComment.deletedAt,
      taskOrganizationId: task.organizationId,
      taskAuthorId: task.authorId,
      taskDueAt: task.dueAt,
    })
    .from(taskComment)
    .innerJoin(task, eq(taskComment.taskId, task.id))
    .where(eq(taskComment.id, parsed.data.commentId))
    .limit(1);

  if (!row) {
    return { ok: false, error: "El comentario no existe." };
  }
  if (row.taskOrganizationId !== ctx.orgId) {
    return {
      ok: false,
      error: "No tienes permisos para eliminar este comentario.",
    };
  }

  if (row.deletedAt !== null) {
    return { ok: true };
  }

  const isAdmin = isOrgAdmin(ctx.role);
  const isAuthor = row.authorId === ctx.userId;
  if (!isAdmin) {
    if (!isAuthor) {
      return {
        ok: false,
        error: "No tienes permisos para eliminar este comentario.",
      };
    }
    if (!isWithinEditWindow(row.createdAt)) {
      return {
        ok: false,
        error: "La ventana de eliminación de 60 minutos expiró.",
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
          "El plazo de esta tarea venció. Solo puedes comentar, no eliminar comentarios previos.",
      };
    }
  }

  const [viewerRow] = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, ctx.userId))
    .limit(1);

  await db
    .update(taskComment)
    .set({
      deletedAt: new Date(),
      deletedByName: viewerRow?.name ?? null,
      deletedByEmail: viewerRow?.email ?? null,
    })
    .where(
      and(
        eq(taskComment.id, parsed.data.commentId),
        eq(taskComment.taskId, row.taskId),
      ),
    );

  revalidateTaskPaths();
  return { ok: true };
}
