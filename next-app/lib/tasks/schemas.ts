import { z } from "zod";

import {
  TASK_STATUS_VALUES,
  TASK_VISIBILITY_VALUES,
} from "@/lib/db/schema/task";

export const taskVisibilitySchema = z.enum(TASK_VISIBILITY_VALUES);
export const taskStatusSchema = z.enum(TASK_STATUS_VALUES);

const titleSchema = z
  .string()
  .trim()
  .min(1, "El título no puede estar vacío.")
  .max(200, "El título no puede superar los 200 caracteres.");

const descriptionSchema = z
  .string()
  .trim()
  .max(5000, "La descripción no puede superar los 5000 caracteres.")
  .optional()
  .or(z.literal("").transform(() => undefined));

const dueAtSchema = z
  .union([z.date(), z.string().datetime({ offset: true })])
  .transform((value) => (value instanceof Date ? value : new Date(value)))
  .refine((d) => !Number.isNaN(d.getTime()), "Fecha inválida.");

const userIdSchema = z.string().min(1, "Usuario inválido.");
const taskIdSchema = z.string().min(1);

export const createTaskSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  dueAt: dueAtSchema.optional(),
  visibility: taskVisibilitySchema.optional(),
  responsibleId: userIdSchema.optional(),
});

export const updateTaskContentSchema = z.object({
  taskId: taskIdSchema,
  title: titleSchema.optional(),
  description: descriptionSchema,
  dueAt: dueAtSchema.nullable().optional(),
});

export const transitionVisibilitySchema = z.object({
  taskId: taskIdSchema,
  to: taskVisibilitySchema,
  dueAt: dueAtSchema.optional(),
  responsibleId: userIdSchema.optional(),
});

export const transitionStatusSchema = z.object({
  taskId: taskIdSchema,
  to: taskStatusSchema,
});

export const claimAuthorshipSchema = z.object({
  taskId: taskIdSchema,
});

export const setResponsibleSchema = z.object({
  taskId: taskIdSchema,
  userId: userIdSchema,
});

export const clearResponsibleSchema = z.object({
  taskId: taskIdSchema,
});

export const addAssigneeSchema = z.object({
  taskId: taskIdSchema,
  userId: userIdSchema,
});

export const removeAssigneeSchema = z.object({
  taskId: taskIdSchema,
  userId: userIdSchema,
});

export const deleteTaskSchema = z.object({
  taskId: taskIdSchema,
});

export const createCommentSchema = z.object({
  taskId: taskIdSchema,
  body: z
    .string()
    .trim()
    .min(1, "El comentario no puede estar vacío.")
    .max(2000, "El comentario no puede superar los 2000 caracteres."),
});

export const deleteCommentSchema = z.object({
  commentId: z.string().min(1, "Comentario inválido."),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskContentInput = z.infer<typeof updateTaskContentSchema>;
export type TransitionVisibilityInput = z.infer<typeof transitionVisibilitySchema>;
export type TransitionStatusInput = z.infer<typeof transitionStatusSchema>;
export type ClaimAuthorshipInput = z.infer<typeof claimAuthorshipSchema>;
export type SetResponsibleInput = z.infer<typeof setResponsibleSchema>;
export type ClearResponsibleInput = z.infer<typeof clearResponsibleSchema>;
export type AddAssigneeInput = z.infer<typeof addAssigneeSchema>;
export type RemoveAssigneeInput = z.infer<typeof removeAssigneeSchema>;
export type DeleteTaskInput = z.infer<typeof deleteTaskSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;
