## Context

Docentix opera con un monorepo pnpm que hoy contiene `next-app/` (la aplicación de producto en Next.js 16 + Tailwind 4 + shadcn) y `openspec/` (specs y changes). El equipo necesita una superficie pública de documentación para usuarios finales, pero quiere evitar dos costos recurrentes:

1. **Conflictos de versiones** entre el Tailwind / Next / React de la app y los del sitio de docs.
2. **Acoplamiento de release**: que actualizar la doc obligue a desplegar la app, o viceversa.

Estado actual de `docs-app/`:

- Fumadocs 16.8.11 + fumadocs-mdx 15.0.6 + Next.js 16 + Tailwind 4 ya instalados.
- Preset `neutral.css` cargado.
- Scaffolding con `content/docs/index.mdx`, `content/docs/test.mdx`, layout base, RootProvider.
- Features AI ya scaffoldeadas (`@ai-sdk/react`, `ai`, `@openrouter/ai-sdk-provider`, `flexsearch`, `components/ai/**`, rutas server).
- `lang="en"` y branding genérico.
- Sin `AGENTS.md`.

No existe `docs-automation/`. Playwright no está instalado en ningún lugar del repo.

Stakeholders: equipo de producto (define qué chunks documentar), Claude Code (genera contenido en changes futuros), usuarios finales (consumen la doc).

## Goals / Non-Goals

**Goals:**

- Dejar `docs-app/` con tema visual alineado a Docentix, español neutral, estructura de carpetas por chunk y reglas claras de proyecto.
- Crear `docs-automation/` como workspace pnpm con Playwright local, scripts stub funcionales y schema de manifest documentado.
- Establecer el contrato del manifest YAML que liga cada chunk de doc con sus screenshots y verificaciones de regresión.
- Mantener `docs-app/` y `next-app/` totalmente desacopladas (sin imports, sin paquete compartido, sin tokens importados).
- No romper nada en `next-app/`.

**Non-Goals:**

- Generar contenido real para los chunks.
- Capturar screenshots reales o implementar la lógica completa de capture/verify (los scripts son stubs).
- Decidir hosting o pipeline de deploy.
- Configurar CI.
- Eliminar o desactivar las features AI ya scaffoldeadas.
- Soportar i18n.

## Decisions

### Decisión 1: Workspaces independientes, sin paquete de tokens compartido

**Elección:** dos workspaces pnpm (`docs-app/`, `docs-automation/`) sin paquete intermedio de UI. Los tokens visuales (`--primary` y derivados) se copian literalmente de `next-app/app/globals.css` a `docs-app/app/global.css`, no se importan.

**Alternativas consideradas:**

- *Paquete `packages/ui-tokens/` compartido.* Rechazada porque fuerza alineación de versiones de Tailwind entre apps y reintroduce el costo que queremos evitar. Cualquier upgrade de Tailwind en una app obligaría a coordinar con la otra.
- *Importar `app/globals.css` de `next-app` directamente.* Rechazada por la misma razón y porque rompe el aislamiento de workspaces.

**Rationale:** la duplicación de ~30 líneas de tokens CSS es barata; el desacople de versiones es caro de recuperar después.

### Decisión 2: Conservar features AI dormidas, build Next.js estándar

**Elección:** mantener `@ai-sdk/react`, `ai`, `@openrouter/ai-sdk-provider`, `flexsearch`, `components/ai/**` y rutas server. No usar `output: 'export'`. La app de docs es un Next.js estándar; la mayoría de páginas resuelven estáticamente, las rutas AI quedan server-side pero no se exponen en navegación.

**Alternativas consideradas:**

- *Borrar todas las deps AI y forzar `output: 'export'`.* Rechazada porque el usuario quiere reactivar AI en el futuro y la limpieza es reversible vía git si cambia de opinión.
- *Configurar `output: 'export'` y dejar el código AI sin rutas.* Rechazada porque las rutas API actuales (`app/api/**`) son server-only y romperían el build estático.

**Rationale:** el costo de mantener deps dormidas es bajo (~MB de node_modules); el costo de tirar código que quizá se reactive es mayor.

**Consecuencia:** la decisión final de hosting queda diferida. La doc se puede levantar localmente con `pnpm --filter docs-app dev` y se puede desplegar a cualquier host que soporte Next.js estándar.

### Decisión 3: Manifest YAML por chunk como contrato doc ↔ app

**Elección:** un archivo YAML por chunk lógico bajo `docs-automation/manifests/<chunk>.yaml` define:

- Lista de screenshots a capturar (id, ruta de la app, pasos previos, selector de recorte opcional).
- Lista de verificaciones de regresión (página de doc afectada, ruta de la app, aserciones de selectores/copy).

El schema se valida con `zod` (la app ya tiene zod 4 instalado en `next-app`, agregamos en `docs-automation`). Los scripts `capture.ts` y `verify.ts` reciben un `--manifest <path>` y delegan ejecución a Playwright.

**Alternativas consideradas:**

- *JSON en lugar de YAML.* Rechazada porque YAML es más ergonómico para escribir/leer a mano (comentarios, multi-línea).
- *Manifests inline en el MDX (frontmatter).* Rechazada porque mezcla preocupaciones: el contenido de la doc no debería contener pasos de Playwright; eso vive aparte.
- *Un solo manifest global.* Rechazada porque el flujo de trabajo va por chunks; un manifest por chunk mantiene el blast radius pequeño.

**Rationale:** un contrato externo, declarativo y por chunk es lo que permite que los changes futuros de generación de doc sean autónomos. Claude escribe el manifest junto con el MDX; humano revisa; Playwright ejecuta.

### Decisión 4: Stubs funcionales para capture/verify en este change

**Elección:** los scripts `capture.ts` y `verify.ts` se crean con CLI completa (parseo de args, validación de manifest, mensajes de salida), pero la ejecución de Playwright es un TODO comentado. Esto permite probar la wiring (`pnpm capture --manifest manifests/example.yaml`) sin requerir manifests reales.

**Alternativas consideradas:**

- *Implementación completa con un manifest de prueba.* Rechazada porque inflaría el scope y obligaría a tomar decisiones sobre qué screenshots capturar antes de tiempo.
- *Solo el schema, sin scripts.* Rechazada porque dejaría el workspace sin punto de entrada verificable.

**Rationale:** stubs ejecutables prueban que el andamiaje funciona y dan al siguiente change un punto de partida claro.

### Decisión 5: `pnpm-workspace.yaml` raíz incluye `docs-automation`

`docs-app/` ya tiene su propio `pnpm-workspace.yaml` interno (heredado del scaffolding). Lo dejamos como está. `docs-automation/` se agrega al `pnpm-workspace.yaml` raíz junto con `next-app/`. Esto permite `pnpm --filter docs-automation <script>` desde la raíz.

### Decisión 6: Branding y locale

- `lang="es"` en `docs-app/app/layout.tsx`.
- Metadata: `title: "Documentación Docentix"`, `description` en español neutral.
- Nombre en el nav: `"Documentación Docentix"`.
- GitHub URL: se mantiene como está hasta que el repo público se confirme.
- Copy en español neutral, regla "Institución" no "Organización", igual que en `next-app`. Capturado en `docs-app/AGENTS.md`.

## Risks / Trade-offs

- **[Riesgo] Las deps AI ocupan espacio sin uso inmediato.** → Mitigación: documentado en proposal y AGENTS.md como "features dormidas"; si nunca se reactivan en 6 meses, abrir change para limpiar.
- **[Riesgo] Tokens copiados pueden desincronizarse con `next-app`.** → Mitigación: aceptamos la divergencia deliberadamente. La doc tiene su propio ciclo; alineación visual estricta no es un goal. Si en el futuro el branding cambia significativamente, se actualizan ambos lados manualmente.
- **[Riesgo] El schema del manifest puede quedar corto cuando empecemos a documentar chunks reales.** → Mitigación: el schema queda en `zod`/JSON Schema; evolucionarlo es trivial y los manifests aún no existen, así que no hay deuda de migración.
- **[Riesgo] Playwright local-only puede atraer presión para mover a CI prematuramente.** → Mitigación: documentado explícitamente en `docs-automation/AGENTS.md` que CI queda fuera de scope hasta que haya manifests reales y un caso de uso claro.
- **[Trade-off] Sin `output: 'export'`, el hosting es más caro/complejo que un CDN puro.** → Aceptado: el costo de mantener deps AI dormidas es mayor que el de un host con runtime Node.

## Migration Plan

Sin migración necesaria. Es código nuevo (workspace y archivos nuevos) más edits no-breaking a `docs-app/` (que está en estado pre-uso). Rollback: revertir los commits del change.

## Open Questions

- ¿El branding "Documentación Docentix" es el final o queremos algo más corto en el nav? Decidible en cualquier momento sin impacto técnico.
- ¿La URL de GitHub en el nav apunta al repo privado actual o a uno público futuro? Por defecto se deja vacía o con el repo actual; cambiar es un edit trivial.
