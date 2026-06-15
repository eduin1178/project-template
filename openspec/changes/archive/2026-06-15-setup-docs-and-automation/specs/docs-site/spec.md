## ADDED Requirements

### Requirement: Sitio de documentación independiente

El sistema SHALL proveer un sitio de documentación pública construido como aplicación Next.js independiente bajo `docs-app/`, completamente desacoplada de `next-app/` (sin imports cruzados, sin paquete compartido, sin dependencia de versiones).

#### Scenario: Build independiente

- **WHEN** un desarrollador ejecuta `pnpm --filter docs-app build` desde la raíz del monorepo
- **THEN** el sitio de docs se construye exitosamente sin requerir que `next-app/` esté instalada ni construida

#### Scenario: Sin imports cruzados

- **WHEN** se inspecciona el código de `docs-app/`
- **THEN** ningún archivo importa desde `next-app/`, `../next-app/`, ni desde un paquete interno compartido

### Requirement: Stack y framework

El sitio de docs SHALL usar Fumadocs 16.x con `fumadocs-ui` y `fumadocs-mdx`, Next.js 16, React 19 y Tailwind 4 como stack base.

#### Scenario: Versiones compatibles

- **WHEN** se inspecciona `docs-app/package.json`
- **THEN** las dependencias incluyen `fumadocs-ui`, `fumadocs-mdx`, `next` 16.x, `react` 19.x y `tailwindcss` 4.x

### Requirement: Coherencia visual sin acoplamiento

El sitio de docs SHALL usar el preset `neutral.css` de Fumadocs y SHALL sobrescribir los tokens de color principales (`--primary` y derivados directos) para acercarse a la paleta de marca de Docentix, copiando los valores literalmente desde `next-app` sin importarlos.

#### Scenario: Tema cargado

- **WHEN** se inspecciona `docs-app/app/global.css`
- **THEN** importa `fumadocs-ui/css/neutral.css` y `fumadocs-ui/css/preset.css`, y define overrides locales para `--primary` y tokens relacionados con valores literales (no `@import` de archivos de `next-app`)

### Requirement: Localización en español neutral

El sitio de docs SHALL renderizar con `lang="es"` y SHALL usar copy en español neutral (segunda persona singular "tú", sin voseo, sin regionalismos), siguiendo la convención "Institución" en vez de "Organización" para texto visible al usuario final.

#### Scenario: Atributo lang

- **WHEN** se carga cualquier página del sitio de docs
- **THEN** el elemento `<html>` tiene `lang="es"`

#### Scenario: Copy neutral

- **WHEN** se inspecciona cualquier contenido visible al usuario final (`index.mdx`, `meta.json`, layout)
- **THEN** no aparecen formas voseo (Ingresá, Hacé, Cerrá, Contanos, querés, sos, dale, etc.) ni "Organización" referido a la entidad institucional

### Requirement: Estructura por chunks lógicos

El sitio de docs SHALL organizar el contenido en `content/docs/` por chunks lógicos del producto, con una carpeta dedicada por chunk y un `meta.json` que define orden y título.

#### Scenario: Carpetas iniciales

- **WHEN** se inspecciona `docs-app/content/docs/`
- **THEN** existen las carpetas `auth/`, `onboarding/`, `super/`, `invitaciones/`, `organizaciones/`, `tareas/`, `permisos/`

#### Scenario: Meta por chunk

- **WHEN** se inspecciona cualquier carpeta de chunk
- **THEN** contiene un `meta.json` con al menos los campos `title` (string) y `pages` (array, puede estar vacío)

### Requirement: Features AI dormidas, build estándar

El sitio de docs SHALL conservar las dependencias y componentes de búsqueda AI (`@ai-sdk/react`, `ai`, `@openrouter/ai-sdk-provider`, `flexsearch`, `components/ai/**`, rutas API relacionadas) sin activarlas en la navegación principal, y SHALL construirse con Next.js estándar (sin `output: 'export'`).

#### Scenario: Build sin output export

- **WHEN** se inspecciona `docs-app/next.config.mjs`
- **THEN** la configuración no incluye `output: 'export'`

#### Scenario: AI presente pero no expuesto

- **WHEN** se carga la navegación principal del sitio
- **THEN** las features AI scaffoldeadas no aparecen como punto de entrada visible al usuario

### Requirement: Reglas de proyecto documentadas

El sitio de docs SHALL incluir un `AGENTS.md` que documente el stack verificado, la regla de español neutral, la convención "Institución", la prohibición de imports desde `next-app/` y cómo agregar páginas y `meta.json`.

#### Scenario: AGENTS.md presente

- **WHEN** se inspecciona `docs-app/`
- **THEN** existe un archivo `AGENTS.md` que cubre stack, copy, separación de proyectos y workflow de contenido
