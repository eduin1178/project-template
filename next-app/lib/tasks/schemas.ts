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

export const createTaskSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  dueAt: dueAtSchema.optional(),
  visibility: taskVisibilitySchema.optional(),
});

export const updateTaskContentSchema = z.object({
  taskId: z.string().min(1),
  title: titleSchema.optional(),
  description: descriptionSchema,
  dueAt: dueAtSchema.nullable().optional(),
});

export const transitionVisibilitySchema = z.object({
  taskId: z.string().min(1),
  to: taskVisibilitySchema,
  dueAt: dueAtSchema.optional(),
});

export const transitionStatusSchema = z.object({
  taskId: z.string().min(1),
  to: taskStatusSchema,
});

export const claimAuthorshipSchema = z.object({
  taskId: z.string().min(1),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskContentInput = z.infer<typeof updateTaskContentSchema>;
export type TransitionVisibilityInput = z.infer<typeof transitionVisibilitySchema>;
export type TransitionStatusInput = z.infer<typeof transitionStatusSchema>;
export type ClaimAuthorshipInput = z.infer<typeof claimAuthorshipSchema>;
