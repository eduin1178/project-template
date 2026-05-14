"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { requireOrgAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { task } from "@/lib/db/schema";
import type { TaskStatus, TaskVisibility } from "@/lib/db/schema/task";

import {
  claimAuthorshipSchema,
  createTaskSchema,
  transitionStatusSchema,
  transitionVisibilitySchema,
  updateTaskContentSchema,
  type ClaimAuthorshipInput,
  type CreateTaskInput,
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

const TASKS_PATH = "/admin/tasks";

function firstError(message: unknown): string {
  return typeof message === "string" && message.length > 0
    ? message
    : "Datos inválidos.";
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
  if (visibility === "active" && !parsed.data.dueAt) {
    return {
      ok: false,
      error: "Define un plazo (dueAt) para activar la tarea.",
    };
  }
  if (visibility === "archived") {
    return {
      ok: false,
      error: "No puedes crear una tarea directamente como archivada.",
    };
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
      organizationId: ctx.orgId,
    });
  } catch (err) {
    console.error("[tasks] createTask falló", err);
    return { ok: false, error: "No pudimos crear la tarea." };
  }

  revalidatePath(TASKS_PATH);
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
    ctx = await requireOrgAdmin();
  } catch {
    return { ok: false, error: "No tienes permisos para editar esta tarea." };
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.description !== undefined) {
    updates.description = parsed.data.description ?? null;
  }
  if (parsed.data.dueAt !== undefined) {
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

  revalidatePath(TASKS_PATH);
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

  if (to === "active") {
    const effectiveDueAt = parsed.data.dueAt ?? current.dueAt;
    if (!effectiveDueAt) {
      return {
        ok: false,
        error: "Define un plazo (dueAt) antes de activar la tarea.",
      };
    }
  }

  const updates: Record<string, unknown> = { visibility: to };
  if (parsed.data.dueAt !== undefined) {
    updates.dueAt = parsed.data.dueAt;
  }

  await db
    .update(task)
    .set(updates)
    .where(
      and(eq(task.id, parsed.data.taskId), eq(task.organizationId, ctx.orgId)),
    );

  revalidatePath(TASKS_PATH);
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

  revalidatePath(TASKS_PATH);
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

  revalidatePath(TASKS_PATH);
  return { ok: true };
}
