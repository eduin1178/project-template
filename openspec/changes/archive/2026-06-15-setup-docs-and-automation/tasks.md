## 1. Workspace raíz

- [x] 1.1 ~~Editar `pnpm-workspace.yaml` raíz para incluir `docs-automation`~~ — **N/A**: no existe `pnpm-workspace.yaml` ni `package.json` raíz. Los subproyectos (`next-app/`, `docs-app/`, `docs-automation/`) son standalone. Convención preservada y documentada en `AGENTS.md` raíz.
- [x] 1.2 Editar `AGENTS.md` raíz para mencionar `docs-app/` y `docs-automation/` como subproyectos con sus propias reglas locales

## 2. Tematizado y locale de docs-app

- [x] 2.1 Editar `docs-app/app/global.css` para sobrescribir `--primary` y tokens derivados con los valores literales del verde Docentix copiados desde `next-app/app/globals.css`
- [x] 2.2 Editar `docs-app/app/layout.tsx` para usar `lang="es"` y agregar metadata (`title`, `description`) en español neutral
- [x] 2.3 Editar `docs-app/lib/shared.ts` (fuente que consume `lib/layout.shared.tsx`) para que el nav muestre "Documentación Docentix" en lugar del placeholder genérico

## 3. Limpieza de contenido placeholder

- [x] 3.1 Eliminar `docs-app/content/docs/test.mdx`
- [x] 3.2 Reescribir `docs-app/content/docs/index.mdx` con una bienvenida real corta en español neutral

## 4. Estructura por chunks lógicos

- [x] 4.1 Crear `docs-app/content/docs/auth/meta.json` con `title` y `pages: []`
- [x] 4.2 Crear `docs-app/content/docs/onboarding/meta.json` con `title` y `pages: []`
- [x] 4.3 Crear `docs-app/content/docs/super/meta.json` con `title` y `pages: []`
- [x] 4.4 Crear `docs-app/content/docs/invitaciones/meta.json` con `title` y `pages: []`
- [x] 4.5 Crear `docs-app/content/docs/organizaciones/meta.json` con `title` y `pages: []`
- [x] 4.6 Crear `docs-app/content/docs/tareas/meta.json` con `title` y `pages: []`
- [x] 4.7 Crear `docs-app/content/docs/permisos/meta.json` con `title` y `pages: []`

## 5. Reglas de proyecto de docs-app

- [x] 5.1 Crear `docs-app/AGENTS.md` con: stack verificado, regla español neutral, regla "Institución" no "Organización", prohibición de imports desde `next-app/`, instrucciones para agregar páginas y `meta.json`, mención de features AI dormidas

## 6. Workspace docs-automation

- [x] 6.1 Crear `docs-automation/package.json` con nombre, scripts (`capture`, `verify`), devDependencies (`@playwright/test`, `tsx`, `typescript`), dependencies (`yaml`, `zod`)
- [x] 6.2 Crear `docs-automation/tsconfig.json` extendiendo configuración base razonable para scripts Node
- [x] 6.3 Crear `docs-automation/playwright.config.ts` configurado solo para uso local (sin variables CI)
- [x] 6.4 Crear estructura de carpetas: `docs-automation/manifests/`, `docs-automation/scripts/`, `docs-automation/schemas/`
- [x] 6.5 Crear `docs-automation/manifests/.gitkeep` para preservar la carpeta vacía. Adicionalmente se creó `docs-automation/pnpm-workspace.yaml` con `allowBuilds: { esbuild: true }` para evitar bloqueo de pnpm en postinstall (espejo del patrón ya usado en `docs-app`).

## 7. Schema del manifest

- [x] 7.1 Crear `docs-automation/schemas/manifest.ts` con el schema `zod` que define la estructura del manifest (`chunk`, `screenshots[]`, `verify[]`)
- [x] 7.2 Crear `docs-automation/schemas/manifest.schema.json` con la versión JSON Schema del mismo contrato
- [x] 7.3 Crear `docs-automation/manifests/example.yaml` como referencia que cumple el schema

## 8. Scripts stub

- [x] 8.1 Crear `docs-automation/scripts/capture.ts` con parseo de args (`--manifest <path>`), lectura YAML, validación contra schema, mensaje de IDs que procesaría y TODO comentado para invocación Playwright (helper compartido en `scripts/loadManifest.ts`)
- [x] 8.2 Crear `docs-automation/scripts/verify.ts` con parseo de args (`--manifest <path>`), lectura YAML, validación contra schema, mensaje de páginas que verificaría y TODO comentado para invocación Playwright
- [x] 8.3 Verificar que ambos scripts retornan código distinto de cero ante manifest inválido o ausente (verificado: exit 1 con manifest faltante, exit 2 sin argumento)

## 9. Reglas de proyecto de docs-automation

- [x] 9.1 Crear `docs-automation/README.md` con: descripción del workspace, schema del manifest documentado, ejemplo válido, instrucciones de ejecución de scripts
- [x] 9.2 Crear `docs-automation/AGENTS.md` con: schema del manifest (resumen), cómo correr scripts, convenciones de naming de screenshots, restricción local-only sin CI, prohibición de imports desde `next-app/` y `docs-app/`

## 10. Verificación final

- [x] 10.1 ~~Ejecutar `pnpm install` desde la raíz~~ → ajustado: `pnpm install` se ejecuta dentro de cada subproyecto (no hay workspace raíz). Verificado en `docs-automation/`: instalación exitosa tras añadir `allowBuilds` para esbuild.
- [x] 10.2 Ejecutar `pnpm build` dentro de `docs-app/` → build exitoso. Rutas estáticas (`/`, `/docs/[[...slug]]`, `/llms.txt`, `/llms-full.txt`) + rutas server AI (`/api/chat`, `/api/search`, `/og/docs`). Coherente con decisión de AI dormida + build Next.js estándar.
- [x] 10.3 Ejecutar `pnpm capture --manifest manifests/example.yaml` dentro de `docs-automation/` → exit 0, reporta 2 screenshots válidos.
- [x] 10.4 Ejecutar `pnpm verify --manifest manifests/example.yaml` dentro de `docs-automation/` → exit 0, reporta 1 verificación válida con 2 aserciones.
- [x] 10.5 Ejecutar scripts con manifest inválido/inexistente → `capture` con `manifests/missing.yaml` salió con exit 1; `verify` sin `--manifest` salió con exit 2. Comportamiento esperado.
