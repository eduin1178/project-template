import { z } from "zod";

export const demoRequestSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Ingresa tu nombre completo.")
    .max(120, "Máximo 120 caracteres."),
  institutionalEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Ingresa un correo válido."),
  institutionName: z
    .string()
    .trim()
    .min(2, "Ingresa el nombre de la institución.")
    .max(160, "Máximo 160 caracteres."),
  department: z
    .string()
    .trim()
    .min(1, "Selecciona un departamento."),
  municipality: z
    .string()
    .trim()
    .min(2, "Ingresa el municipio.")
    .max(120, "Máximo 120 caracteres."),
  role: z.enum(["rector", "coordinator", "other"], {
    message: "Selecciona un rol.",
  }),
  teacherCount: z.coerce
    .number({ message: "Ingresa un número." })
    .int("Debe ser un número entero.")
    .min(1, "Debe ser al menos 1.")
    .max(10000, "Valor demasiado alto."),
  message: z
    .string()
    .trim()
    .max(1000, "Máximo 1000 caracteres.")
    .optional()
    .or(z.literal("")),
});

export type DemoRequestInput = z.infer<typeof demoRequestSchema>;
