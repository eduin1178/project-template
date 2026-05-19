import { z } from 'zod';

/*
 * Schema del manifest YAML por chunk.
 *
 * Cada chunk lógico de documentación (auth, onboarding, super, etc.) puede
 * tener su propio manifest bajo manifests/<chunk>.yaml que declara:
 *  - screenshots a capturar contra la app real
 *  - verificaciones de regresión (¿los pasos descritos en la doc siguen
 *    funcionando?)
 *
 * Los scripts capture.ts y verify.ts leen este schema para validar manifests
 * antes de delegar a Playwright.
 */

const stepSchema = z.object({
  action: z.enum(['goto', 'click', 'fill', 'wait', 'press']),
  selector: z.string().optional(),
  value: z.string().optional(),
  url: z.string().optional(),
  timeout: z.number().int().positive().optional(),
});

const screenshotSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(
      /^[a-z0-9-]+$/,
      'id debe ser kebab-case (a-z, 0-9, guiones)'
    ),
  route: z.string().min(1).describe('Ruta de la app a visitar, ej: /login'),
  steps: z.array(stepSchema).optional(),
  clip: z
    .object({
      selector: z.string(),
    })
    .optional()
    .describe('Si se define, recorta la captura al selector indicado'),
  description: z.string().optional(),
});

const assertionSchema = z.object({
  type: z.enum(['selector-exists', 'text-contains', 'url-matches']),
  selector: z.string().optional(),
  text: z.string().optional(),
  pattern: z.string().optional(),
});

const verifySchema = z.object({
  page: z
    .string()
    .min(1)
    .describe('Ruta relativa al MDX afectado, ej: auth/login.mdx'),
  route: z.string().min(1).describe('Ruta de la app a verificar'),
  steps: z.array(stepSchema).optional(),
  assertions: z.array(assertionSchema).min(1),
});

export const manifestSchema = z.object({
  chunk: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'chunk debe ser kebab-case'),
  description: z.string().optional(),
  screenshots: z.array(screenshotSchema).default([]),
  verify: z.array(verifySchema).default([]),
});

export type Manifest = z.infer<typeof manifestSchema>;
export type Screenshot = z.infer<typeof screenshotSchema>;
export type VerifyEntry = z.infer<typeof verifySchema>;
