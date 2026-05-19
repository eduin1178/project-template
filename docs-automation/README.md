# docs-automation

Workspace local de scripts para capturar screenshots y verificar regresiones
de la documentación pública de Docentix (`docs-app/`). Usa Playwright dirigido
por manifests declarativos en YAML.

> **Local-only.** Este workspace no corre en CI. La automatización completa
> con Playwright es un stub en este momento — los scripts validan manifests y
> reportan qué harían, pero la invocación real del browser está pendiente
> para un change futuro.

## Instalación

```bash
cd docs-automation
pnpm install
pnpm exec playwright install chromium   # solo la primera vez
```

## Comandos

```bash
# Validar y "capturar" (stub) los screenshots de un manifest
pnpm capture --manifest manifests/<chunk>.yaml

# Validar y "verificar" (stub) las regresiones de un manifest
pnpm verify --manifest manifests/<chunk>.yaml
```

Ambos scripts:

- Salen con código `0` si el manifest es válido.
- Salen con código `1` si el manifest existe pero no cumple el schema o el
  YAML está malformado.
- Salen con código `2` si falta el argumento `--manifest`.

## Schema del manifest

Un manifest por chunk lógico de documentación. La fuente de verdad del schema
vive en [`schemas/manifest.ts`](./schemas/manifest.ts) (zod) y se replica como
JSON Schema en [`schemas/manifest.schema.json`](./schemas/manifest.schema.json).

### Estructura general

```yaml
chunk: <kebab-case>          # nombre del chunk (auth, onboarding, …)
description: <texto libre>   # opcional
screenshots:
  - id: <kebab-case>
    route: /ruta/de/la/app
    description: <texto>     # opcional
    steps:                   # opcional, pasos previos a la captura
      - action: goto|click|fill|wait|press
        selector: <css>      # según acción
        value: <texto>       # para fill
        url: <ruta>          # para goto
        timeout: <ms>        # para wait
    clip:                    # opcional, recorte al selector
      selector: <css>
verify:
  - page: auth/login.mdx     # archivo MDX afectado
    route: /login            # ruta de la app a verificar
    steps: [...]             # mismos pasos disponibles
    assertions:
      - type: selector-exists
        selector: <css>
      - type: text-contains
        text: <texto>
      - type: url-matches
        pattern: <regex>
```

### Ejemplo completo

Mira [`manifests/example.yaml`](./manifests/example.yaml). Es un manifest válido
pensado solo como referencia; **no** lo uses para capturas reales.

## Convenciones

- **Nombres de chunk** coinciden con carpetas en `docs-app/content/docs/`.
- **Screenshots** se guardan (en el futuro) en
  `docs-app/public/screenshots/<chunk>/<id>.png`.
- **IDs** en kebab-case (`login-form`, `dashboard-empty`).
- Un manifest no productivo (referencia o ejemplo) debe nombrarse
  `example.yaml` o llevar prefijo `_`.

## Aislamiento

Este workspace **no importa nada** desde `next-app/` ni `docs-app/`. La única
conexión con esas apps es a través de Playwright apuntando a URLs locales.
Si necesitas saber qué selectores existen, navega la app y léelos
manualmente — no copies código.
