## 1. Workspace raíz

- [ ] 1.1 Editar `pnpm-workspace.yaml` raíz para incluir `docs-automation` junto a los workspaces existentes
- [ ] 1.2 Editar `AGENTS.md` raíz para mencionar `docs-app/` y `docs-automation/` como subproyectos con sus propias reglas locales

## 2. Tematizado y locale de docs-app

- [ ] 2.1 Editar `docs-app/app/global.css` para sobrescribir `--primary` y tokens derivados con los valores literales del verde Docentix copiados desde `next-app/app/globals.css`
- [ ] 2.2 Editar `docs-app/app/layout.tsx` para usar `lang="es"` y agregar metadata (`title`, `description`) en español neutral
- [ ] 2.3 Editar `docs-app/lib/layout.shared.tsx` para que el nav muestre "Documentación Docentix" en lugar del placeholder genérico

## 3. Limpieza de contenido placeholder

- [ ] 3.1 Eliminar `docs-app/content/docs/test.mdx`
- [ ] 3.2 Reescribir `docs-app/content/docs/index.mdx` con una bienvenida real corta en español neutral

## 4. Estructura por chunks lógicos

- [ ] 4.1 Crear `docs-app/content/docs/auth/meta.json` con `title` y `pages: []`
- [ ] 4.2 Crear `docs-app/content/docs/onboarding/meta.json` con `title` y `pages: []`
- [ ] 4.3 Crear `docs-app/content/docs/super/meta.json` con `title` y `pages: []`
- [ ] 4.4 Crear `docs-app/content/docs/invitaciones/meta.json` con `title` y `pages: []`
- [ ] 4.5 Crear `docs-app/content/docs/organizaciones/meta.json` con `title` y `pages: []`
- [ ] 4.6 Crear `docs-app/content/docs/tareas/meta.json` con `title` y `pages: []`
- [ ] 4.7 Crear `docs-app/content/docs/permisos/meta.json` con `title` y `pages: []`

## 5. Reglas de proyecto de docs-app

- [ ] 5.1 Crear `docs-app/AGENTS.md` con: stack verificado, regla español neutral, regla "Institución" no "Organización", prohibición de imports desde `next-app/`, instrucciones para agregar páginas y `meta.json`, mención de features AI dormidas

## 6. Workspace docs-automation

- [ ] 6.1 Crear `docs-automation/package.json` con nombre, scripts (`capture`, `verify`), devDependencies (`@playwright/test`, `tsx`, `typescript`), dependencies (`yaml`, `zod`)
- [ ] 6.2 Crear `docs-automation/tsconfig.json` extendiendo configuración base razonable para scripts Node
- [ ] 6.3 Crear `docs-automation/playwright.config.ts` configurado solo para uso local (sin variables CI)
- [ ] 6.4 Crear estructura de carpetas: `docs-automation/manifests/`, `docs-automation/scripts/`, `docs-automation/schemas/`
- [ ] 6.5 Crear `docs-automation/.gitkeep` o equivalente en `manifests/` para preservar la carpeta vacía

## 7. Schema del manifest

- [ ] 7.1 Crear `docs-automation/schemas/manifest.ts` con el schema `zod` que define la estructura del manifest (`chunk`, `screenshots[]`, `verify[]`)
- [ ] 7.2 Crear `docs-automation/schemas/manifest.schema.json` generado o escrito a mano con la versión JSON Schema del mismo contrato
- [ ] 7.3 Crear `docs-automation/manifests/example.yaml` como referencia (sin ejecución real) que cumple el schema

## 8. Scripts stub

- [ ] 8.1 Crear `docs-automation/scripts/capture.ts` con parseo de args (`--manifest <path>`), lectura YAML, validación contra schema, mensaje de IDs que procesaría y TODO comentado para invocación Playwright
- [ ] 8.2 Crear `docs-automation/scripts/verify.ts` con parseo de args (`--manifest <path>`), lectura YAML, validación contra schema, mensaje de páginas que verificaría y TODO comentado para invocación Playwright
- [ ] 8.3 Verificar que ambos scripts retornan código distinto de cero ante manifest inválido o ausente

## 9. Reglas de proyecto de docs-automation

- [ ] 9.1 Crear `docs-automation/README.md` con: descripción del workspace, schema del manifest documentado, al menos un ejemplo válido, instrucciones de ejecución de scripts
- [ ] 9.2 Crear `docs-automation/AGENTS.md` con: schema del manifest (resumen), cómo correr scripts, convenciones de naming de screenshots (`<chunk>/<id>.png`), restricción local-only sin CI, prohibición de imports desde `next-app/` y `docs-app/`

## 10. Verificación final

- [ ] 10.1 Ejecutar `pnpm install` desde la raíz y confirmar que los tres workspaces resuelven sin errores
- [ ] 10.2 Ejecutar `pnpm --filter docs-app build` y confirmar build exitoso
- [ ] 10.3 Ejecutar `pnpm --filter docs-automation capture --manifest manifests/example.yaml` y confirmar salida de validación exitosa
- [ ] 10.4 Ejecutar `pnpm --filter docs-automation verify --manifest manifests/example.yaml` y confirmar salida de validación exitosa
- [ ] 10.5 Ejecutar los scripts con un manifest inválido o inexistente y confirmar exit code distinto de cero
