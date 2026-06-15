## ADDED Requirements

### Requirement: Workspace de automatización local

El sistema SHALL proveer un workspace pnpm `docs-automation/` con Playwright instalado, configurado únicamente para uso local (sin CI), separado tanto de `next-app/` como de `docs-app/`.

#### Scenario: Workspace registrado

- **WHEN** se inspecciona `pnpm-workspace.yaml` en la raíz del monorepo
- **THEN** la lista de workspaces incluye `docs-automation`

#### Scenario: Playwright instalado

- **WHEN** se inspecciona `docs-automation/package.json`
- **THEN** las devDependencies incluyen `@playwright/test`

#### Scenario: Configuración local

- **WHEN** se inspecciona `docs-automation/playwright.config.ts`
- **THEN** no contiene configuración específica de CI (sin `forbidOnly`, `retries` agresivos, ni `workers` derivados de variables CI)

### Requirement: Schema del manifest por chunk

El sistema SHALL definir un schema YAML que liga cada chunk de documentación con sus screenshots a capturar y sus verificaciones de regresión. El schema SHALL ser validable programáticamente mediante `zod` o JSON Schema.

#### Scenario: Schema documentado

- **WHEN** se inspecciona `docs-automation/`
- **THEN** existe un archivo `schemas/manifest.schema.json` (o equivalente `zod`) que define al menos los campos: `chunk` (string), `screenshots[]` (con `id`, `route`, `steps?`, `clip?`), `verify[]` (con `page`, `route`, `assertions[]`)

#### Scenario: Schema documentado en README

- **WHEN** se inspecciona `docs-automation/README.md`
- **THEN** el documento explica la estructura del manifest, los campos requeridos y al menos un ejemplo de manifest válido

### Requirement: Scripts ejecutables stub

El sistema SHALL exponer dos scripts ejecutables — `capture` y `verify` — accesibles vía `pnpm --filter docs-automation <script>`, que parsean argumentos CLI, validan el manifest YAML recibido y emiten mensajes claros de salida. La ejecución real de Playwright PUEDE ser un stub (TODO documentado) en este change.

#### Scenario: Scripts declarados

- **WHEN** se inspecciona `docs-automation/package.json`
- **THEN** la sección `scripts` incluye `capture` y `verify`

#### Scenario: Validación de manifest

- **WHEN** se ejecuta `pnpm --filter docs-automation capture --manifest <ruta>` con un manifest válido
- **THEN** el script confirma que el manifest es válido y reporta los IDs de screenshot que procesaría

#### Scenario: Manifest inválido detectado

- **WHEN** se ejecuta cualquiera de los scripts con un manifest YAML malformado o que no cumple el schema
- **THEN** el script sale con código distinto de cero y un mensaje de error que indica el problema de validación

### Requirement: Reglas de proyecto documentadas

El workspace de automatización SHALL incluir un `AGENTS.md` que documente el schema del manifest, cómo correr los scripts, convenciones de naming de screenshots y el alcance local-only (sin CI).

#### Scenario: AGENTS.md presente

- **WHEN** se inspecciona `docs-automation/`
- **THEN** existe un archivo `AGENTS.md` que cubre schema, ejecución de scripts, naming y restricción local-only

### Requirement: Aislamiento del workspace

El workspace `docs-automation/` SHALL ser independiente de `next-app/` y `docs-app/` (sin imports cruzados, sin dependencias compartidas más allá de paquetes públicos de npm).

#### Scenario: Sin imports cruzados

- **WHEN** se inspecciona el código de `docs-automation/`
- **THEN** ningún archivo importa desde `next-app/`, `docs-app/` ni rutas relativas a esos workspaces
