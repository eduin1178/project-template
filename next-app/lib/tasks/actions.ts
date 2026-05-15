"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import {
  isOrgAdmin,
  requireOrgAdmin,
  requireOrgMember,
} from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { task, taskAssignee, taskDocument } from "@/lib/db/schema";
import type { TaskStatus, TaskVisibility } from "@/lib/db/schema/task";
import {
  deletePrivateAsset,
  requireDocumentsBucket,
} from "@/lib/storage/r2";

import { isUserMemberOfOrg } from "./queries";
import {
  addAssigneeSchema,
  claimAuthorshipSchema,
  clearResponsibleSchema,
  createTaskSchema,
  deleteTaskSchema,
  removeAssigneeSchema,
  setResponsibleSchema,
  transitionStatusSchema,
  transitionVisibilitySchema,
  updateTaskContentSchema,
  type AddAssigneeInput,
  type ClaimAuthorshipInput,
  type ClearResponsibleInput,
  type CreateTaskInput,
  type DeleteTaskInput,
  type RemoveAssigneeInput,
  type SetResponsibleInput,
  type TransitionStatusInput,
  type TransitionVisibilityInput,
  type UpdateTaskContentInput,
} from "./schemas";
import {
  isStatusTransitionAllowed,
  isVisibilityTransitionAllowed,
} from "./transitions";

type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

const ADMIN_TASKS_PATH = "/admin/tasks";
const TASKS_PATH = "/tasks";

function firstError(message: unknown): string {
  return typeof message === "string" && message.length > 0
    ? message
    : "Datos inválidos.";
}

function revalidateTaskPaths() {
  revalidatePath(ADMIN_TASKS_PATH);
  revalidatePath(TASKS_PATH);
}

export async function createTask(
  input: CreateTaskInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error.issues[0]?.message) };
  }

  let ctx;
  try {
    ctx = await requireOrgAdmin();
  } catch {
    return { ok: false, error: "No tienes permisos para crear tareas." };
  }

  const visibility = (parsed.data.visibility ?? "draft") as TaskVisibility;
  if (visibility === "archived") {
    return {
      ok: false,
      error: "No puedes crear una tarea directamente como archivada.",
    };
  }

  let responsibleId: string | null = null;
  if (parsed.data.responsibleId) {
    const ok = await isUserMemberOfOrg({
      orgId: ctx.orgId,
      userId: parsed.data.responsibleId,
    });
    if (!ok) {
      return {
        ok: false,
        error: "El responsable seleccionado no pertenece a tu organización.",
      };
    }
    responsibleId = parsed.data.responsibleId;
  }

  if (visibility === "active") {
    if (!parsed.data.dueAt) {
      return {
        ok: false,
        error: "Define un plazo (dueAt) para activar la tarea.",
      };
    }
    if (!responsibleId) {
      return {
        ok: false,
        error: "Define un responsable para activar la tarea.",
      };
    }
  }

  const id = randomUUID();
  try {
    await db.insert(task).values({
      id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      dueAt: parsed.data.dueAt ?? null,
      visibility,
      status: "pending",
      authorId: ctx.userId,
      responsibleId,
      organizationId: ctx.orgId,
    });
  } catch (err) {
    console.error("[tasks] createTask falló", err);
    return { ok: false, error: "No pudimos crear la tarea." };
  }

  revalidateTaskPaths();
  return { ok: true, data: { id } };
}

export async function updateTaskContent(
  input: UpdateTaskContentInput,
): Promise<ActionResult> {
  const parsed = updateTaskContentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error.issues[0]?.message) };
  }

  let ctx;
  try {
    ctx = await requireOrgMember();
  } catch {
    return { ok: false, error: "No tienes permisos para editar esta tarea." };
  }

  const [current] = await db
    .select({
      id: task.id,
      authorId: task.authorId,
      visibility: task.visibility,
    })
    .from(task)
    .where(
      and(eq(task.id, parsed.data.taskId), eq(task.organizationId, ctx.orgId)),
    )
    .limit(1);

  if (!current) {
    return { ok: false, error: "La tarea no existe en tu organización." };
  }

  const visibility = current.visibility as TaskVisibility;
  const isAdmin = isOrgAdmin(ctx.role);
  const isAuthor = current.authorId === ctx.userId;
  const canEditContent =
    isAdmin || (isAuthor && visibility === "draft");
  const canEditDueAt = isAdmin && visibility !== "archived";

  const updates: Record<string, unknown> = {};

  if (parsed.data.title !== undefined) {
    if (!canEditContent) {
      return {
        ok: false,
        error:
          "Solo puedes editar el título mientras la tarea esté en borrador.",
      };
    }
    updates.title = parsed.data.title;
  }

  if (parsed.data.description !== undefined) {
    if (!canEditContent) {
      return {
        ok: false,
        error:
          "Solo puedes editar la descripción mientras la tarea esté en borrador.",
      };
    }
    updates.description = parsed.data.description ?? null;
  }

  if (parsed.data.dueAt !== undefined) {
    if (!canEditDueAt) {
      return {
        ok: false,
        error:
          "No puedes modificar el plazo de una tarea archivada o sin permisos de administrador.",
      };
    }
    updates.dueAt = parsed.data.dueAt ?? null;
  }

  if (Object.keys(updates).length === 0) {
    return { ok: true };
  }

  const result = await db
    .update(task)
    .set(updates)
    .where(
      and(eq(task.id, parsed.data.taskId), eq(task.organizationId, ctx.orgId)),
    )
    .returning({ id: task.id });

  if (result.length === 0) {
    return { ok: false, error: "La tarea no existe en tu organización." };
  }

  revalidateTaskPaths();
  return { ok: true };
}

export async function transitionVisibility(
  input: TransitionVisibilityInput,
): Promise<ActionResult> {
  const parsed = transitionVisibilitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error.issues[0]?.message) };
  }

  let ctx;
  try {
    ctx = await requireOrgAdmin();
  } catch {
    return {
      ok: false,
      error: "No tienes permisos para cambiar la visibilidad.",
    };
  }

  const [current] = await db
    .select({
      id: task.id,
      visibility: task.visibility,
      dueAt: task.dueAt,
      responsibleId: task.responsibleId,
    })
    .from(task)
    .where(
      and(eq(task.id, parsed.data.taskId), eq(task.organizationId, ctx.orgId)),
    )
    .limit(1);

  if (!current) {
    return { ok: false, error: "La tarea no existe en tu organización." };
  }

  const from = current.visibility as TaskVisibility;
  const to = parsed.data.to;
  if (!isVisibilityTransitionAllowed(from, to)) {
    return {
      ok: false,
      error: "Transición de visibilidad no permitida.",
    };
  }

  let nextResponsibleId: string | null | undefined;
  if (parsed.data.responsibleId !== undefined) {
    const ok = await isUserMemberOfOrg({
      orgId: ctx.orgId,
      userId: parsed.data.responsibleId,
    });
    if (!ok) {
      return {
        ok: false,
        error: "El responsable seleccionado no pertenece a tu organización.",
      };
    }
    nextResponsibleId = parsed.data.responsibleId;
  }

  if (to === "active") {
    const effectiveDueAt = parsed.data.dueAt ?? current.dueAt;
    if (!effectiveDueAt) {
      return {
        ok: false,
        error: "Define un plazo (dueAt) antes de activar la tarea.",
      };
    }
    const effectiveResponsibleId =
      nextResponsibleId !== undefined
        ? nextResponsibleId
        : current.responsibleId;
    if (!effectiveResponsibleId) {
      return {
        ok: false,
        error: "Define un responsable antes de activar la tarea.",
      };
    }
  }

  const updates: Record<string, unknown> = { visibility: to };
  if (parsed.data.dueAt !== undefined) {
    updates.dueAt = parsed.data.dueAt;
  }
  if (nextResponsibleId !== undefined) {
    // si el nuevo responsable está en assignees, hay que limpiarlo
    if (nextResponsibleId) {
      await db
        .delete(taskAssignee)
        .where(
          and(
            eq(taskAssignee.taskId, parsed.data.taskId),
            eq(taskAssignee.userId, nextResponsibleId),
          ),
        );
    }
    updates.responsibleId = nextResponsibleId;
  }

  await db
    .update(task)
    .set(updates)
    .where(
      and(eq(task.id, parsed.data.taskId), eq(task.organizationId, ctx.orgId)),
    );

  revalidateTaskPaths();
  return { ok: true };
}

export async function transitionStatus(
  input: TransitionStatusInput,
): Promise<ActionResult> {
  const parsed = transitionStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error.issues[0]?.message) };
  }

  let ctx;
  try {
    ctx = await requireOrgAdmin();
  } catch {
    return {
      ok: false,
      error: "No tienes permisos para cambiar el estado.",
    };
  }

  const [current] = await db
    .select({ id: task.id, status: task.status })
    .from(task)
    .where(
      and(eq(task.id, parsed.data.taskId), eq(task.organizationId, ctx.orgId)),
    )
    .limit(1);

  if (!current) {
    return { ok: false, error: "La tarea no existe en tu organización." };
  }

  const from = current.status as TaskStatus;
  const to = parsed.data.to;
  if (!isStatusTransitionAllowed(from, to)) {
    return {
      ok: false,
      error: "Transición de estado no permitida.",
    };
  }

  await db
    .update(task)
    .set({ status: to })
    .where(
      and(eq(task.id, parsed.data.taskId), eq(task.organizationId, ctx.orgId)),
    );

  revalidateTaskPaths();
  return { ok: true };
}

export async function claimAuthorship(
  input: ClaimAuthorshipInput,
): Promise<ActionResult> {
  const parsed = claimAuthorshipSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error.issues[0]?.message) };
  }

  let ctx;
  try {
    ctx = await requireOrgAdmin();
  } catch {
    return {
      ok: false,
      error: "No tienes permisos para tomar posesión de esta tarea.",
    };
  }

  const [current] = await db
    .select({ id: task.id, authorId: task.authorId })
    .from(task)
    .where(
      and(eq(task.id, parsed.data.taskId), eq(task.organizationId, ctx.orgId)),
    )
    .limit(1);

  if (!current) {
    return { ok: false, error: "La tarea no existe en tu organización." };
  }

  if (current.authorId === ctx.userId) {
    return { ok: true };
  }

  await db
    .update(task)
    .set({ authorId: ctx.userId })
    .where(
      and(eq(task.id, parsed.data.taskId), eq(task.organizationId, ctx.orgId)),
    );

  revalidateTaskPaths();
  return { ok: true };
}

async function authorizeTeamMutation(taskId: string): Promise<
  | {
      ok: true;
      ctx: Awaited<ReturnType<typeof requireOrgMember>>;
      current: { authorId: string; visibility: TaskVisibility };
    }
  | { ok: false; error: string }
> {
  let ctx;
  try {
    ctx = await requireOrgMember();
  } catch {
    return { ok: false, error: "No tienes permisos sobre esta tarea." };
  }

  const [current] = await db
    .select({
      authorId: task.authorId,
      visibility: task.visibility,
    })
    .from(task)
    .where(and(eq(task.id, taskId), eq(task.organizationId, ctx.orgId)))
    .limit(1);

  if (!current) {
    return { ok: false, error: "La tarea no existe en tu organización." };
  }

  const isAdmin = isOrgAdmin(ctx.role);
  const isAuthor = current.authorId === ctx.userId;
  if (!isAdmin && !isAuthor) {
    return { ok: false, error: "No tienes permisos sobre esta tarea." };
  }

  return {
    ok: true,
    ctx,
    current: {
      authorId: current.authorId,
      visibility: current.visibility as TaskVisibility,
    },
  };
}

export async function setResponsible(
  input: SetResponsibleInput,
): Promise<ActionResult> {
  const parsed = setResponsibleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error.issues[0]?.message) };
  }

  const auth = await authorizeTeamMutation(parsed.data.taskId);
  if (!auth.ok) return auth;

  const memberOk = await isUserMemberOfOrg({
    orgId: auth.ctx.orgId,
    userId: parsed.data.userId,
  });
  if (!memberOk) {
    return {
      ok: false,
      error: "El usuario seleccionado no pertenece a tu organización.",
    };
  }

  // si el usuario ya está en assignees, removerlo primero (disyunción)
  await db
    .delete(taskAssignee)
    .where(
      and(
        eq(taskAssignee.taskId, parsed.data.taskId),
        eq(taskAssignee.userId, parsed.data.userId),
      ),
    );

  await db
    .update(task)
    .set({ responsibleId: parsed.data.userId })
    .where(
      and(
        eq(task.id, parsed.data.taskId),
        eq(task.organizationId, auth.ctx.orgId),
      ),
    );

  revalidateTaskPaths();
  return { ok: true };
}

export async function clearResponsible(
  input: ClearResponsibleInput,
): Promise<ActionResult> {
  const parsed = clearResponsibleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error.issues[0]?.message) };
  }

  const auth = await authorizeTeamMutation(parsed.data.taskId);
  if (!auth.ok) return auth;

  if (auth.current.visibility === "active") {
    return {
      ok: false,
      error: "No puedes quitar el responsable de una tarea activa.",
    };
  }

  await db
    .update(task)
    .set({ responsibleId: null })
    .where(
      and(
        eq(task.id, parsed.data.taskId),
        eq(task.organizationId, auth.ctx.orgId),
      ),
    );

  revalidateTaskPaths();
  return { ok: true };
}

export async function addAssignee(
  input: AddAssigneeInput,
): Promise<ActionResult> {
  const parsed = addAssigneeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error.issues[0]?.message) };
  }

  const auth = await authorizeTeamMutation(parsed.data.taskId);
  if (!auth.ok) return auth;

  const memberOk = await isUserMemberOfOrg({
    orgId: auth.ctx.orgId,
    userId: parsed.data.userId,
  });
  if (!memberOk) {
    return {
      ok: false,
      error: "El usuario seleccionado no pertenece a tu organización.",
    };
  }

  const [current] = await db
    .select({ responsibleId: task.responsibleId })
    .from(task)
    .where(eq(task.id, parsed.data.taskId))
    .limit(1);

  if (current?.responsibleId === parsed.data.userId) {
    return {
      ok: false,
      error: "Ese usuario ya es el responsable de la tarea.",
    };
  }

  await db
    .insert(taskAssignee)
    .values({ taskId: parsed.data.taskId, userId: parsed.data.userId })
    .onConflictDoNothing();

  revalidateTaskPaths();
  return { ok: true };
}

export async function removeAssignee(
  input: RemoveAssigneeInput,
): Promise<ActionResult> {
  const parsed = removeAssigneeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error.issues[0]?.message) };
  }

  const auth = await authorizeTeamMutation(parsed.data.taskId);
  if (!auth.ok) return auth;

  await db
    .delete(taskAssignee)
    .where(
      and(
        eq(taskAssignee.taskId, parsed.data.taskId),
        eq(taskAssignee.userId, parsed.data.userId),
      ),
    );

  revalidateTaskPaths();
  return { ok: true };
}

export async function deleteTask(
  input: DeleteTaskInput,
): Promise<ActionResult> {
  const parsed = deleteTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error.issues[0]?.message) };
  }

  const auth = await authorizeTeamMutation(parsed.data.taskId);
  if (!auth.ok) return auth;

  if (auth.current.visibility !== "draft") {
    return {
      ok: false,
      error: "Solo puedes eliminar tareas en borrador.",
    };
  }

  const docRows = await db
    .select({ storageKey: taskDocument.storageKey })
    .from(taskDocument)
    .where(eq(taskDocument.taskId, parsed.data.taskId));

  if (docRows.length > 0) {
    let bucket: string | null = null;
    try {
      bucket = requireDocumentsBucket();
    } catch (err) {
      console.warn(
        "[tasks] deleteTask: bucket de documentos no configurado, blobs huérfanos posibles",
        err,
      );
    }
    if (bucket) {
      const results = await Promise.allSettled(
        docRows.map((row) =>
          deletePrivateAsset({ bucket: bucket as string, key: row.storageKey }),
        ),
      );
      results.forEach((result, idx) => {
        if (result.status === "rejected") {
          console.warn(
            "[tasks] deleteTask: blob no eliminado, queda huérfano",
            result.reason,
            { storageKey: docRows[idx].storageKey },
          );
        }
      });
    }
  }

  await db
    .delete(task)
    .where(
      and(
        eq(task.id, parsed.data.taskId),
        eq(task.organizationId, auth.ctx.orgId),
      ),
    );

  revalidateTaskPaths();
  return { ok: true };
}
