# AGENTS.md — docs-automation

Reglas para trabajar dentro de `docs-automation/`. Este workspace es un
conjunto de scripts locales que dirigen Playwright para capturar screenshots
y verificar regresiones de la documentación pública.

## Alcance

- **Solo local.** No hay configuración de CI ni se planea agregarla en este
  change. Si se necesita CI a futuro, será un change explícito que incluya
  fixtures de DB, usuarios seed y aislamiento de entorno.
- **No es un test runner del producto.** No usa Playwright para testear la
  app de Docentix — verifica que la documentación sigue describiendo flujos
  reales.
- **Stubs hoy.** Los scripts `capture.ts` y `verify.ts` validan manifests y
  reportan plan de ejecución, pero la invocación de Playwright es un TODO
  comentado. La implementación real llega cuando exista al menos un manifest
  real por chunk.

## Aislamiento — REGLA INVIOLABLE

- Prohibido importar nada desde `next-app/` o `docs-app/` (relativo o por
  alias). Este workspace solo conoce esas apps a través de URLs HTTP.
- Si necesitas un selector o copy de la UI, ejecútalo contra la app en local
  y léelo del DOM. No copies código entre proyectos.

## Stack

- `@playwright/test` — runner y librería de browser.
- `yaml` — parser de manifests.
- `zod` — validación del schema.
- `tsx` — ejecución directa de TypeScript en Node.

Sin Next.js, sin React, sin frameworks de UI.

## Schema del manifest (resumen)

Un archivo YAML por chunk bajo `manifests/<chunk>.yaml`:

```yaml
chunk: <kebab-case>
screenshots:
  - id: <kebab-case>
    route: /ruta
    steps: [...]              # opcional
    clip: { selector: <css> } # opcional
verify:
  - page: <chunk>/<archivo>.mdx
    route: /ruta
    assertions: [...]
```

Detalles completos en [`README.md`](./README.md) y schemas en `schemas/`.

## Comandos

```bash
pnpm capture --manifest manifests/<chunk>.yaml
pnpm verify  --manifest manifests/<chunk>.yaml
```

Exit codes:

- `0`: manifest válido (y, cuando esté implementado, ejecución exitosa).
- `1`: manifest inválido o YAML malformado.
- `2`: argumento `--manifest` ausente.

## Convenciones de naming

- IDs de screenshot en kebab-case: `login-form`, `dashboard-empty`,
  `task-detail-comments`.
- Archivos de screenshot se guardan en `docs-app/public/screenshots/<chunk>/<id>.png`.
- Un manifest por chunk lógico. No mezcles chunks en un solo archivo.
- `example.yaml` y archivos con prefijo `_` se consideran referencia, no
  manifests productivos.

## Cuando agregues lógica real

Cuando llegue el momento de implementar la captura/verificación real:

1. Reemplaza los TODOs en `scripts/capture.ts` y `scripts/verify.ts`.
2. Asegura que cada step y cada assertion del schema tenga un manejo
   determinístico.
3. No declares una verificación pasada sin haberla ejecutado.
4. Documenta cómo levantar la app local antes de correr el script (host,
   puerto, datos seed mínimos).
