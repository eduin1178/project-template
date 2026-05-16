import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { task, taskChecklistItem, user } from "@/lib/db/schema";

import { createTaskInternal, type TaskExecutor } from "./internal";

export const ONBOARDING_TASK_TITLE = "Aprender a usar Docentix";

export const ONBOARDING_TASK_DESCRIPTION = [
  "Bienvenido a Docentix. Estas son las funciones principales que te ayudarán a empezar:",
  "",
  "• Panel — visualiza tus tareas y actividad reciente desde el dashboard de tu institución.",
  "• Tareas — crea, asigna y haz seguimiento del trabajo con responsables, fechas de vencimiento y estados.",
  "• Checklist — divide cada tarea en pasos verificables.",
  "• Documentos — adjunta y descarga archivos relacionados con cada tarea.",
  "• Comentarios — conversa con tu equipo dentro de cada tarea.",
  "• Miembros — invita personas a tu institución y gestiona sus roles.",
  "• Notificaciones — recibe alertas de invitaciones, cambios de estado, vencimientos y nuevos comentarios.",
  "• Perfil — completa tus datos personales y preferencias.",
].join("\n");

export const ONBOARDING_CHECKLIST_ITEMS: readonly string[] = [
  "Explorar el panel principal de mi institución",
  "Completar mi perfil",
  "Crear mi primera tarea",
  "Agregar un checklist a una tarea",
  "Adjuntar un documento a una tarea",
  "Dejar un comentario en una tarea",
  "Revisar la lista de miembros de la institución",
  "Configurar mis preferencias de notificaciones",
];

const ONBOARDING_DUE_DAYS = 7;

export type CreateOnboardingTaskInput = {
  inviterId: string;
  inviteeId: string;
  organizationId: string;
};

export type CreateOnboardingTaskResult = {
  id: string;
  created: boolean;
};

/**
 * Crea (o reutiliza si ya existe) la tarea de onboarding "Aprender a usar
 * Docentix" para el invitado dentro de la institución indicada. Diseñada para
 * invocarse dentro de la transacción que acepta una invitación.
 *
 * Idempotente: si ya existe una tarea con el mismo título asignada al mismo
 * responsable en la misma institución, NO crea otra ni inserta checklist.
 */
export async function createOnboardingTask(
  input: CreateOnboardingTaskInput,
  executor: TaskExecutor = db,
): Promise<CreateOnboardingTaskResult> {
  const [existing] = await executor
    .select({ id: task.id })
    .from(task)
    .where(
      and(
        eq(task.organizationId, input.organizationId),
        eq(task.responsibleId, input.inviteeId),
        eq(task.title, ONBOARDING_TASK_TITLE),
      ),
    )
    .limit(1);

  if (existing) {
    return { id: existing.id, created: false };
  }

  const authorId = await resolveAuthorId({
    inviterId: input.inviterId,
    inviteeId: input.inviteeId,
    executor,
  });

  const dueAt = new Date(
    Date.now() + ONBOARDING_DUE_DAYS * 24 * 60 * 60 * 1000,
  );

  const { id: taskId } = await createTaskInternal(
    {
      title: ONBOARDING_TASK_TITLE,
      description: ONBOARDING_TASK_DESCRIPTION,
      dueAt,
      visibility: "active",
      status: "pending",
      authorId,
      responsibleId: input.inviteeId,
      organizationId: input.organizationId,
    },
    executor,
  );

  for (const label of ONBOARDING_CHECKLIST_ITEMS) {
    await executor.insert(taskChecklistItem).values({
      id: randomUUID(),
      taskId,
      label,
      checked: false,
    });
  }

  return { id: taskId, created: true };
}

async function resolveAuthorId({
  inviterId,
  inviteeId,
  executor,
}: {
  inviterId: string;
  inviteeId: string;
  executor: TaskExecutor;
}): Promise<string> {
  const [row] = await executor
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, inviterId))
    .limit(1);
  return row ? row.id : inviteeId;
}
