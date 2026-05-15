"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";

import { isOrgAdmin, requireOrgMember } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { task, taskAssignee, taskChecklistItem } from "@/lib/db/schema";

import { assertCanManageChecklist } from "./checklist-permissions";
import {
  checklistItemLabelSchema,
  createChecklistItemSchema,
  deleteChecklistItemSchema,
  toggleChecklistItemSchema,
  updateChecklistItemLabelSchema,
} from "./schemas";

type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

export type ChecklistItemClientView = {
  id: string;
  label: string;
  checked: boolean;
  createdAt: Date;
};

const ADMIN_TASKS_PATH = "/admin/tasks";
const TASKS_PATH = "/tasks";

function revalidateTaskPaths() {
  revalidatePath(ADMIN_TASKS_PATH);
  revalidatePath(TASKS_PATH);
}

/**
 * Carga la tarea, verifica pertenencia a la org del viewer, y retorna
 * el contexto necesario para assertCanManageChecklist.
 */
async function loadTaskForChecklist({
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
      taskRow: {
        id: string;
        organizationId: string;
        visibility: string;
        authorId: string;
        responsibleId: string | null;
        assignees: Array<{ userId: string }>;
      };
    }
  | { ok: false; error: string }
> {
  const [row] = await db
    .select({
      id: task.id,
      organizationId: task.organizationId,
      visibility: task.visibility,
      authorId: task.authorId,
      responsibleId: task.responsibleId,
    })
    .from(task)
    .where(and(eq(task.id, taskId), eq(task.organizationId, orgId)))
    .limit(1);

  if (!row) {
    return { ok: false, error: "Tarea no encontrada." };
  }

  // Cargamos assignees solo si no es admin (optimización)
  let assignees: Array<{ userId: string }> = [];
  if (!isAdmin) {
    assignees = await db
      .select({ userId: taskAssignee.userId })
      .from(taskAssignee)
      .where(eq(taskAssignee.taskId, taskId));
  }

  return {
    ok: true,
    taskRow: {
      id: row.id,
      organizationId: row.organizationId,
      visibility: row.visibility as string,
      authorId: row.authorId,
      responsibleId: row.responsibleId ?? null,
      assignees,
    },
  };
}

/**
 * createChecklistItem(taskId, label)
 *
 * Carga la tarea, verifica org, aplica matriz de autorización,
 * valida label, inserta item y retorna el item creado.
 */
export async function createChecklistItem(
  taskId: string,
  label: string,
): Promise<ActionResult<ChecklistItemClientView>> {
  const parsed = createChecklistItemSchema.safeParse({ taskId, label });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  let ctx;
  try {
    ctx = await requireOrgMember();
  } catch {
    return { ok: false, error: "No tienes permisos para realizar esta acción." };
  }

  const isAdmin = isOrgAdmin(ctx.role);
  const loadResult = await loadTaskForChecklist({
    taskId: parsed.data.taskId,
    orgId: ctx.orgId,
    viewerUserId: ctx.userId,
    isAdmin,
  });

  if (!loadResult.ok) {
    return { ok: false, error: "No tienes permisos para realizar esta acción." };
  }

  try {
    assertCanManageChecklist({
      viewer: { userId: ctx.userId, role: ctx.role },
      task: {
        organizationId: loadResult.taskRow.organizationId,
        visibility: loadResult.taskRow.visibility as "draft" | "active" | "archived",
        authorId: loadResult.taskRow.authorId,
        responsibleId: loadResult.taskRow.responsibleId,
        assignees: loadResult.taskRow.assignees,
      },
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No tienes permisos para realizar esta acción.",
    };
  }

  const id = randomUUID();
  const trimmedLabel = parsed.data.label.trim();

  try {
    const [inserted] = await db
      .insert(taskChecklistItem)
      .values({ id, taskId: parsed.data.taskId, label: trimmedLabel })
      .returning({
        id: taskChecklistItem.id,
        label: taskChecklistItem.label,
        checked: taskChecklistItem.checked,
        createdAt: taskChecklistItem.createdAt,
      });

    revalidateTaskPaths();
    return {
      ok: true,
      data: {
        id: inserted.id,
        label: inserted.label,
        checked: inserted.checked,
        createdAt: inserted.createdAt,
      },
    };
  } catch (err) {
    console.error("[tasks] createChecklistItem: inserción falló", err);
    return { ok: false, error: "No pudimos guardar el item. Intenta de nuevo." };
  }
}

/**
 * updateChecklistItemLabel(itemId, label)
 *
 * Carga item+tarea, verifica org, aplica gate, valida label,
 * actualiza label y updatedAt sin tocar campos de toggle.
 */
export async function updateChecklistItemLabel(
  itemId: string,
  label: string,
): Promise<ActionResult> {
  const parsed = updateChecklistItemLabelSchema.safeParse({ itemId, label });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  let ctx;
  try {
    ctx = await requireOrgMember();
  } catch {
    return { ok: false, error: "No tienes permisos para realizar esta acción." };
  }

  const isAdmin = isOrgAdmin(ctx.role);

  // Cargar item + tarea en una sola query con join
  const [row] = await db
    .select({
      itemId: taskChecklistItem.id,
      taskId: taskChecklistItem.taskId,
      taskOrgId: task.organizationId,
      taskVisibility: task.visibility,
      taskAuthorId: task.authorId,
      taskResponsibleId: task.responsibleId,
    })
    .from(taskChecklistItem)
    .innerJoin(task, eq(taskChecklistItem.taskId, task.id))
    .where(eq(taskChecklistItem.id, parsed.data.itemId))
    .limit(1);

  if (!row) {
    return { ok: false, error: "Item no encontrado." };
  }
  if (row.taskOrgId !== ctx.orgId) {
    return { ok: false, error: "No tienes permisos para realizar esta acción." };
  }

  let assignees: Array<{ userId: string }> = [];
  if (!isAdmin) {
    assignees = await db
      .select({ userId: taskAssignee.userId })
      .from(taskAssignee)
      .where(eq(taskAssignee.taskId, row.taskId));
  }

  try {
    assertCanManageChecklist({
      viewer: { userId: ctx.userId, role: ctx.role },
      task: {
        organizationId: row.taskOrgId,
        visibility: row.taskVisibility as "draft" | "active" | "archived",
        authorId: row.taskAuthorId,
        responsibleId: row.taskResponsibleId ?? null,
        assignees,
      },
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No tienes permisos para realizar esta acción.",
    };
  }

  const trimmedLabel = parsed.data.label.trim();
  const labelValidation = checklistItemLabelSchema.safeParse(trimmedLabel);
  if (!labelValidation.success) {
    return { ok: false, error: labelValidation.error.issues[0]?.message ?? "Label inválido." };
  }

  try {
    await db
      .update(taskChecklistItem)
      .set({ label: trimmedLabel })
      .where(eq(taskChecklistItem.id, parsed.data.itemId));

    revalidateTaskPaths();
    return { ok: true };
  } catch (err) {
    console.error("[tasks] updateChecklistItemLabel: update falló", err);
    return { ok: false, error: "No pudimos actualizar el item. Intenta de nuevo." };
  }
}

/**
 * toggleChecklistItem(itemId, checked)
 *
 * Toggle idempotente:
 *   - Si checked solicitado == actual → no-op silencioso (ok: true sin UPDATE)
 *   - Si difiere y nuevo es true  → checked=true, checkedById=viewer.id, checkedAt=now()
 *   - Si difiere y nuevo es false → checked=false, checkedById=NULL, checkedAt=NULL
 */
export async function toggleChecklistItem(
  itemId: string,
  checked: boolean,
): Promise<ActionResult> {
  const parsed = toggleChecklistItemSchema.safeParse({ itemId, checked });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  let ctx;
  try {
    ctx = await requireOrgMember();
  } catch {
    return { ok: false, error: "No tienes permisos para realizar esta acción." };
  }

  const isAdmin = isOrgAdmin(ctx.role);

  const [row] = await db
    .select({
      itemId: taskChecklistItem.id,
      itemChecked: taskChecklistItem.checked,
      taskId: taskChecklistItem.taskId,
      taskOrgId: task.organizationId,
      taskVisibility: task.visibility,
      taskAuthorId: task.authorId,
      taskResponsibleId: task.responsibleId,
    })
    .from(taskChecklistItem)
    .innerJoin(task, eq(taskChecklistItem.taskId, task.id))
    .where(eq(taskChecklistItem.id, parsed.data.itemId))
    .limit(1);

  if (!row) {
    return { ok: false, error: "Item no encontrado." };
  }
  if (row.taskOrgId !== ctx.orgId) {
    return { ok: false, error: "No tienes permisos para realizar esta acción." };
  }

  let assignees: Array<{ userId: string }> = [];
  if (!isAdmin) {
    assignees = await db
      .select({ userId: taskAssignee.userId })
      .from(taskAssignee)
      .where(eq(taskAssignee.taskId, row.taskId));
  }

  try {
    assertCanManageChecklist({
      viewer: { userId: ctx.userId, role: ctx.role },
      task: {
        organizationId: row.taskOrgId,
        visibility: row.taskVisibility as "draft" | "active" | "archived",
        authorId: row.taskAuthorId,
        responsibleId: row.taskResponsibleId ?? null,
        assignees,
      },
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No tienes permisos para realizar esta acción.",
    };
  }

  // No-op idempotente: si el estado no cambia, retornar éxito sin UPDATE
  if (row.itemChecked === parsed.data.checked) {
    return { ok: true };
  }

  const now = new Date();
  const updateValues = parsed.data.checked
    ? { checked: true, checkedById: ctx.userId, checkedAt: now, updatedAt: now }
    : { checked: false, checkedById: null, checkedAt: null, updatedAt: now };

  try {
    await db
      .update(taskChecklistItem)
      .set(updateValues)
      .where(eq(taskChecklistItem.id, parsed.data.itemId));

    revalidateTaskPaths();
    return { ok: true };
  } catch (err) {
    console.error("[tasks] toggleChecklistItem: update falló", err);
    return { ok: false, error: "No pudimos actualizar el item. Intenta de nuevo." };
  }
}

/**
 * deleteChecklistItem(itemId)
 *
 * Hard delete irreversible.
 */
export async function deleteChecklistItem(
  itemId: string,
): Promise<ActionResult> {
  const parsed = deleteChecklistItemSchema.safeParse({ itemId });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  let ctx;
  try {
    ctx = await requireOrgMember();
  } catch {
    return { ok: false, error: "No tienes permisos para realizar esta acción." };
  }

  const isAdmin = isOrgAdmin(ctx.role);

  const [row] = await db
    .select({
      itemId: taskChecklistItem.id,
      taskId: taskChecklistItem.taskId,
      taskOrgId: task.organizationId,
      taskVisibility: task.visibility,
      taskAuthorId: task.authorId,
      taskResponsibleId: task.responsibleId,
    })
    .from(taskChecklistItem)
    .innerJoin(task, eq(taskChecklistItem.taskId, task.id))
    .where(eq(taskChecklistItem.id, parsed.data.itemId))
    .limit(1);

  if (!row) {
    return { ok: false, error: "Item no encontrado." };
  }
  if (row.taskOrgId !== ctx.orgId) {
    return { ok: false, error: "No tienes permisos para realizar esta acción." };
  }

  let assignees: Array<{ userId: string }> = [];
  if (!isAdmin) {
    assignees = await db
      .select({ userId: taskAssignee.userId })
      .from(taskAssignee)
      .where(eq(taskAssignee.taskId, row.taskId));
  }

  try {
    assertCanManageChecklist({
      viewer: { userId: ctx.userId, role: ctx.role },
      task: {
        organizationId: row.taskOrgId,
        visibility: row.taskVisibility as "draft" | "active" | "archived",
        authorId: row.taskAuthorId,
        responsibleId: row.taskResponsibleId ?? null,
        assignees,
      },
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No tienes permisos para realizar esta acción.",
    };
  }

  try {
    await db
      .delete(taskChecklistItem)
      .where(eq(taskChecklistItem.id, parsed.data.itemId));

    revalidateTaskPaths();
    return { ok: true };
  } catch (err) {
    console.error("[tasks] deleteChecklistItem: delete falló", err);
    return { ok: false, error: "No pudimos eliminar el item. Intenta de nuevo." };
  }
}

/**
 * listChecklistItemsForTask — helper de lectura para la query de detalle.
 * Solo expone campos seguros al cliente (sin checkedById/checkedAt).
 */
export async function listChecklistItemsForTask(
  taskId: string,
): Promise<ChecklistItemClientView[]> {
  const rows = await db
    .select({
      id: taskChecklistItem.id,
      label: taskChecklistItem.label,
      checked: taskChecklistItem.checked,
      createdAt: taskChecklistItem.createdAt,
    })
    .from(taskChecklistItem)
    .where(eq(taskChecklistItem.taskId, taskId))
    .orderBy(asc(taskChecklistItem.createdAt));

  return rows;
}
