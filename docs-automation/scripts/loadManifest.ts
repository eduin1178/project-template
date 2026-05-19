import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { manifestSchema, type Manifest } from '../schemas/manifest';

export interface ParsedArgs {
  manifestPath: string;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const idx = args.findIndex((a) => a === '--manifest' || a === '-m');
  if (idx === -1 || !args[idx + 1]) {
    throw new Error(
      'Falta argumento requerido: --manifest <ruta-al-archivo.yaml>',
    );
  }
  return { manifestPath: resolve(args[idx + 1]) };
}

export function loadManifest(path: string): Manifest {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`No se pudo leer el manifest en ${path}: ${message}`);
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`YAML malformado en ${path}: ${message}`);
  }

  const result = manifestSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.') || '(raíz)'}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Manifest inválido en ${path}:\n${issues}`,
    );
  }

  return result.data;
}
