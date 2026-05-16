## ADDED Requirements

### Requirement: Convención de copy "Institución" vs `organization`

Todo texto visible al usuario final SHALL usar la palabra **"Institución"** (con sus variantes de género y número: "institución", "Instituciones", "instituciones") en lugar de **"Organización"** ("organización", "Organizaciones", "organizaciones"). Esta regla SHALL aplicarse a:

- Páginas y componentes de la UI (`next-app/src/app/**` y `next-app/src/components/**`) en su texto visible.
- Plantillas de email renderizadas con React Email (`next-app/src/emails/**`).
- Mensajes de validación, errores, empty states, tooltips, labels de formularios, títulos de diálogos, descripciones de help y toasts.
- Documentación dirigida a usuario final.

La palabra `organization` / `organización` SHALL conservarse, sin cambios, en:

- Identificadores de código (variables, funciones, props, tipos como `organizationId`, `organizationName`).
- Nombres de tablas y columnas de base de datos (`organization`, `organizationId`).
- Rutas de API y endpoints (`/api/organization/*`).
- Referencias al plugin `organization` de Better Auth (configuración, hooks, helpers).
- Comentarios técnicos en el código fuente.
- Specs de OpenSpec en `openspec/specs/**` (estos documentan el modelo técnico).
- Archivos de configuración y `AGENTS.md` cuando describen el modelo técnico (no el copy visible).

La regla SHALL quedar documentada explícitamente en `next-app/AGENTS.md`, con una referencia corta desde el `AGENTS.md` raíz del repositorio.

#### Scenario: Copy UI usa "Institución"
- **WHEN** se inspecciona cualquier texto visible al usuario final en páginas, componentes, plantillas de email o mensajes (errores, empty states, toasts, tooltips, labels)
- **THEN** ese texto usa "Institución" / "institución" / "Instituciones" / "instituciones" (no "Organización" ni sus variantes de género/número)

#### Scenario: Identificadores técnicos permanecen como `organization`
- **WHEN** se inspecciona el código fuente (variables, funciones, props, tipos, columnas de DB, rutas de API)
- **THEN** los identificadores técnicos siguen usando `organization` / `organizationId` / `organizationName` sin cambio

#### Scenario: Regla documentada en AGENTS.md
- **WHEN** se inspecciona `next-app/AGENTS.md`
- **THEN** existe una sección que explicita la convención "Institución" en UI vs `organization` en código, con la lista de excepciones técnicas

#### Scenario: Referencia desde AGENTS.md raíz
- **WHEN** se inspecciona el `AGENTS.md` de la raíz del repositorio
- **THEN** existe al menos una mención o link a la regla detallada en `next-app/AGENTS.md`

#### Scenario: Copy nuevo respeta español neutral
- **WHEN** un agente o desarrollador agrega copy nuevo aplicando esta convención
- **THEN** el copy usa segunda persona singular `tú` con conjugaciones estándar, sin voseo, consistente con la regla global del proyecto
