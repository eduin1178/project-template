## Why

Docentix necesita una superficie de documentación pública para usuarios finales (docentes, admins de institución, supers), separada de la aplicación de producto. La doc cubrirá flujos como auth, onboarding, gestión de instituciones, invitaciones, tareas y permisos. La generación de contenido se hará por chunks lógicos asistida por Claude Code y validada contra la UI real con Playwright, pero antes de generar contenido necesitamos el entorno operativo listo: app de docs construible y desplegable, automatización local instalada y una convención clara para los manifests que ataran cada chunk de doc con sus screenshots y verificaciones.

Hoy `docs-app/` ya existe con Fumadocs 16.8.11 + Next.js 16 + Tailwind 4 instalado por scaffolding, pero está en estado quickstart: contiene placeholders (`test.mdx`), no tiene el tema alineado con la marca, no tiene la estructura de carpetas por chunk, no tiene reglas de proyecto (`AGENTS.md`) y no existe el workspace de automatización. Tampoco hay un contrato definido entre la doc y la app real (manifests).

## What Changes

- **Mantener `docs-app/` y `next-app/` totalmente desacopladas.** Sin paquete compartido de estilos. Cero imports cruzados. Cada app es dueña total de su Tailwind, sus tokens y sus versiones.
- **Tematizar Fumadocs** alineando el `--primary` y derivados con el verde Docentix (`oklch(0.508 0.118 165.612)` y familia). Valores **copiados literalmente**, no importados, desde `next-app/app/globals.css`. Mantener el preset `neutral.css` ya cargado.
- **Localizar la app de docs:** `lang="es"` en `app/layout.tsx`, metadata en español neutral, branding "Documentación Docentix".
- **Limpiar el scaffolding placeholder:** eliminar `content/docs/test.mdx`, reemplazar `content/docs/index.mdx` por una bienvenida real corta.
- **Crear el esqueleto de carpetas por chunk lógico** en `content/docs/`: `auth/`, `onboarding/`, `super/`, `invitaciones/`, `organizaciones/`, `tareas/`, `permisos/`. Cada una con `meta.json` con `title` y `pages: []` vacío. Sin contenido real — eso son changes futuros.
- **Conservar las dependencias AI ya instaladas** (`@ai-sdk/react`, `ai`, `@openrouter/ai-sdk-provider`, `flexsearch`, `components/ai/**`, rutas `app/api/`) como features dormidas para integración futura. Consecuencia: el build NO usa `output: 'export'`; queda como Next.js estándar con la mayoría de páginas estáticas y rutas AI server-rendered pero no expuestas en navegación. La decisión final de hosting queda fuera de este change.
- **Crear el workspace `docs-automation/`** dentro del monorepo pnpm:
  - `package.json` con `@playwright/test` y scripts `capture`, `verify`
  - `playwright.config.ts` configurado solo para uso local (sin CI)
  - Estructura: `manifests/`, `scripts/capture.ts`, `scripts/verify.ts`, `schemas/manifest.schema.json`
  - `README.md` con el schema YAML del manifest documentado y ejemplos
  - Sin manifests reales todavía
- **Definir el schema del manifest YAML por chunk** — formato que liga una carpeta de doc con (a) screenshots a capturar y (b) verificaciones de regresión. Es el contrato que usarán los changes futuros de generación de contenido. Schema documentado, validable con `zod` o JSON Schema, sin implementación de capture/verify funcional aún (los scripts son stubs con la firma correcta).
- **Documentación de proyecto:**
  - `docs-app/AGENTS.md` — stack verificado, copy en español neutral, regla "Institución" no "Organización", prohibición de imports desde `next-app/`, cómo agregar páginas y `meta.json`
  - `docs-automation/AGENTS.md` — schema del manifest, cómo correr scripts, convenciones de naming de screenshots
- **Actualizar `AGENTS.md` raíz** para mencionar `docs-app/` y `docs-automation/` como subproyectos con sus propias reglas locales.

## Capabilities

### New Capabilities

- `docs-site` — Sitio de documentación pública construido con Fumadocs. Define la estructura por chunks lógicos, las reglas de copy y la separación arquitectónica respecto a la app de producto.
- `docs-automation` — Andamiaje local para capturar screenshots y verificar regresiones de doc usando Playwright dirigido por Claude vía MCP. Define el contrato del manifest YAML por chunk.

### Modified Capabilities

<!-- Sin capabilities modificadas. La app de producto (next-app) no se toca. -->

## Impact

- **Código nuevo:**
  - `docs-app/AGENTS.md`
  - `docs-app/app/global.css` (overrides de tokens; archivo ya existe, se edita)
  - `docs-app/app/layout.tsx` (lang="es", metadata; archivo ya existe, se edita)
  - `docs-app/content/docs/index.mdx` (bienvenida real; archivo ya existe, se reescribe)
  - `docs-app/content/docs/{auth,onboarding,super,invitaciones,organizaciones,tareas,permisos}/meta.json` (carpetas nuevas)
  - `docs-automation/package.json`
  - `docs-automation/playwright.config.ts`
  - `docs-automation/scripts/capture.ts` (stub)
  - `docs-automation/scripts/verify.ts` (stub)
  - `docs-automation/schemas/manifest.schema.json`
  - `docs-automation/README.md`
  - `docs-automation/AGENTS.md`
- **Código eliminado:**
  - `docs-app/content/docs/test.mdx`
- **Código modificado:**
  - `AGENTS.md` (raíz) — agregar referencia a los dos subproyectos nuevos
  - `pnpm-workspace.yaml` (raíz) — incluir `docs-automation` como workspace
- **Dependencias nuevas:** solo en `docs-automation/`: `@playwright/test`, `yaml`, `zod` (validación de manifest). En `docs-app/` ninguna dependencia se agrega ni se quita.
- **APIs:** sin cambios.
- **Base de datos:** sin cambios.
- **Specs nuevas:** `openspec/specs/docs-site/spec.md`, `openspec/specs/docs-automation/spec.md`.
- **Sin impacto** en `next-app/`, autenticación, routing por slug, base de datos, ni en `/super`.
- **Hosting:** este change NO define hosting. La doc se podrá levantar localmente con `pnpm --filter docs-app dev`. Decisión de deploy (Vercel, Cloudflare Pages, S3+CloudFront, etc.) queda como change futuro junto con la decisión sobre features AI server-rendered.

## Non-goals

- Generar contenido real para cualquier chunk de doc.
- Capturar screenshots reales o ejecutar verificaciones reales.
- Reactivar o desactivar definitivamente las features AI de Fumadocs.
- Decidir hosting o pipeline de deploy.
- Configurar CI para correr Playwright.
- Soportar i18n (queda en español por ahora; multi-idioma sería un change posterior).
- Búsqueda full-text custom (se usa la que trae Fumadocs por defecto).
