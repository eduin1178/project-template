/*
 * verify.ts — verifica regresiones declaradas en un manifest YAML.
 *
 * Estado actual: stub. Valida el manifest y reporta qué páginas
 * verificaría. La invocación real de Playwright queda como TODO para un
 * change posterior.
 *
 * Uso:
 *   pnpm verify --manifest manifests/<chunk>.yaml
 */

import { parseArgs, loadManifest } from './loadManifest';

function main(): void {
  let manifestPath: string;
  try {
    ({ manifestPath } = parseArgs(process.argv));
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(2);
  }

  let manifest;
  try {
    manifest = loadManifest(manifestPath);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  console.log(`✓ Manifest válido: ${manifestPath}`);
  console.log(`  chunk: ${manifest.chunk}`);
  console.log(`  verificaciones declaradas: ${manifest.verify.length}`);

  if (manifest.verify.length === 0) {
    console.log('  (sin verificaciones para procesar)');
    return;
  }

  for (const entry of manifest.verify) {
    console.log(
      `  - ${entry.page} (ruta: ${entry.route}, ${entry.assertions.length} aserciones)`,
    );
  }

  // TODO: invocar Playwright para ejecutar steps y aserciones contra la app.
  // Plan: lanzar chromium, navegar a entry.route, ejecutar steps[],
  // evaluar cada assertion y reportar resultados. Exit code != 0 si alguna
  // assertion falla.
  console.log('\n[STUB] Verificación real con Playwright pendiente.');
}

main();
