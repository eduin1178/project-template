/*
 * capture.ts — captura screenshots declarados en un manifest YAML.
 *
 * Estado actual: stub. Valida el manifest y reporta qué screenshots
 * procesaría. La invocación real de Playwright queda como TODO para un
 * change posterior, una vez existan manifests reales por chunk.
 *
 * Uso:
 *   pnpm capture --manifest manifests/<chunk>.yaml
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
  console.log(`  screenshots declarados: ${manifest.screenshots.length}`);

  if (manifest.screenshots.length === 0) {
    console.log('  (sin screenshots para procesar)');
    return;
  }

  for (const shot of manifest.screenshots) {
    console.log(`  - ${shot.id} → ${shot.route}`);
  }

  // TODO: invocar Playwright para capturar cada screenshot.
  // Plan: lanzar chromium, navegar a manifest.screenshots[i].route,
  // ejecutar steps[], aplicar clip si existe, guardar en
  // ../docs-app/public/screenshots/<chunk>/<id>.png
  console.log('\n[STUB] Captura real con Playwright pendiente.');
}

main();
