# ui-foundation Specification

## Purpose

Fundación del sistema de UI del proyecto: shadcn/ui instalado manualmente sobre Tailwind v4 con un tema externo preservado, convención "shadcn-first" (prohibido duplicar primitivas), separación clara entre primitivas (`components/ui/`) y composiciones de dominio (`components/<feature>/`).

## Requirements


### Requirement: Instalación manual de shadcn/ui

El proyecto SHALL adoptar shadcn/ui mediante instalación manual (sin ejecutar `npx shadcn init` automatizado con valores por defecto). El archivo `components.json`, las dependencias de Radix, las utilidades (`cn`), los tokens CSS de tema y cada primitiva SHALL agregarse explícitamente revisando que el tema producido por el constructor externo se preserve sin sobrescritura.

#### Scenario: `components.json` presente y configurado
- **WHEN** se inspecciona la raíz del proyecto `next-app`
- **THEN** existe un `components.json` con `style`, `tailwind.config`, `tailwind.css`, alias (`components`, `utils`, `ui`, `lib`, `hooks`) y `tsx: true` configurados manualmente

#### Scenario: Tokens de tema del constructor externo aplicados
- **WHEN** se inspecciona `styles/globals.css` (o equivalente)
- **THEN** contiene las variables CSS (`--background`, `--foreground`, `--primary`, etc.) del tema generado por el constructor externo, agrupadas en `:root` y en `.dark` cuando aplique

### Requirement: shadcn/ui como única fuente de primitivas

El proyecto SHALL usar componentes de shadcn/ui para toda primitiva de UI disponible en el catálogo de shadcn (Button, Input, Textarea, Select, Card, Dialog, Sheet, Accordion, Form, Label, Badge, Separator, Tabs, Tooltip, NavigationMenu, DropdownMenu, etc.). Crear componentes personalizados que dupliquen una primitiva ya provista por shadcn SHALL estar prohibido.

#### Scenario: Botón usa primitiva shadcn
- **WHEN** se inspecciona cualquier `<button>` interactivo de la landing
- **THEN** está implementado mediante el componente `Button` de `components/ui/button.tsx` (shadcn), no un `<button>` con clases Tailwind sueltas ni un componente custom equivalente

#### Scenario: Acordeón usa primitiva shadcn
- **WHEN** se inspecciona la sección FAQ
- **THEN** está construida sobre el componente `Accordion` de shadcn, no sobre detalles/summary nativos ni un acordeón custom

#### Scenario: Formulario usa primitivas shadcn
- **WHEN** se inspecciona el formulario de solicitar demo
- **THEN** los campos están envueltos con `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` de shadcn integrados con `react-hook-form`

### Requirement: Componentes de composición separados de primitivas

Los componentes de composición específicos del dominio (`Hero`, `FeatureGrid`, `FaqList`, `PricingCards`, etc.) SHALL vivir bajo `components/landing/` y SHALL componerse a partir de primitivas de `components/ui/` (shadcn). NO SHALL contener lógica de estilizado de bajo nivel que duplique lo que ya hace una primitiva shadcn.

#### Scenario: Estructura de carpetas
- **WHEN** se inspecciona `next-app/components/`
- **THEN** existe la separación: `components/ui/` (shadcn manual) y `components/landing/` (composiciones de dominio)

### Requirement: Utilidad `cn` y helpers compartidos

El proyecto SHALL exportar una utilidad `cn` (combinación de `clsx` + `tailwind-merge`) desde `lib/utils.ts` (o equivalente) usada por todas las primitivas y composiciones para componer clases.

#### Scenario: `cn` disponible vía alias
- **WHEN** un componente importa `cn`
- **THEN** lo hace desde `@/lib/utils` y la función combina clases con resolución de conflictos Tailwind correcta

### Requirement: Tailwind v4 con tokens del tema externo

El proyecto SHALL usar Tailwind CSS v4 con la configuración mínima necesaria para que shadcn/ui funcione (capa `@theme`, variables CSS del tema externo expuestas como tokens) sin agregar configuraciones que entren en conflicto con el tema del constructor externo.

#### Scenario: Tailwind v4 detectado en build
- **WHEN** se ejecuta `npm run build`
- **THEN** el build completa sin warnings de Tailwind y el CSS resultante incluye los tokens del tema externo

### Requirement: Shell `AppSidebar` reutilizable

El proyecto SHALL exponer un componente `AppSidebar` en `components/layout/app-sidebar.tsx` basado en el block `sidebar-07` de shadcn, parametrizable mediante una prop `config: SidebarConfig`. El tipo `SidebarConfig` SHALL definir al menos: `brand` (label + href + icono opcional), `items` (array de `{ label, href, icon?, matchPrefix? }`), y `user` (name, email, image). El componente SHALL ser consumido por los layouts de `/super`, `/admin` y `/app`.

#### Scenario: Componente vive en components/layout
- **WHEN** se inspecciona `components/`
- **THEN** existe `components/layout/app-sidebar.tsx` y NO existe duplicado en `components/super/`, `components/admin/` ni `components/app/`

#### Scenario: Configs por segmento
- **WHEN** se inspecciona `components/layout/`
- **THEN** existen archivos de config por segmento (e.g. `contexts/super.ts`, `contexts/admin.ts`, `contexts/app.ts`) que exportan un `SidebarConfig` específico

#### Scenario: Sidebar instalado vía shadcn CLI
- **WHEN** se inspecciona `components/ui/sidebar.tsx`
- **THEN** existe y proviene del registry shadcn (instalado con `npx shadcn@latest add sidebar-07`)

#### Scenario: Marca el item activo según la ruta
- **WHEN** la URL coincide con el `href` o `matchPrefix` de un item de la config
- **THEN** el item se renderiza en estado activo (variante visual destacada)

### Requirement: Primitiva `EmptyState`

El proyecto SHALL exponer un componente `EmptyState` en `components/ui/empty-state.tsx` con props `icon?`, `title`, `description?`, `action?`. SHALL usarse en al menos las vistas de "sin organizaciones" y "sin invitaciones".

#### Scenario: Empty state se renderiza con todas las props
- **WHEN** se renderiza `<EmptyState icon={...} title="..." description="..." action={<Button>...</Button>} />`
- **THEN** se muestra icono centrado arriba, título prominente, descripción debajo, y action al pie

#### Scenario: Empty state mínimo
- **WHEN** se renderiza `<EmptyState title="..." />`
- **THEN** se muestra sólo el título sin romper el layout

#### Scenario: Vive en components/ui
- **WHEN** se inspecciona `components/ui/`
- **THEN** existe `empty-state.tsx` (es una primitiva, no una composición de dominio)

### Requirement: Stubs de sidebar en /admin y /app

Los layouts de `/admin` y `/app` SHALL consumir `AppSidebar` con configs propias que contengan al menos un ítem placeholder. El objetivo SHALL ser que el shell esté listo para crecer en fases posteriores sin refactor del layout.

#### Scenario: /admin renderiza sidebar
- **WHEN** un usuario con `member.role === "admin"` navega a `/admin`
- **THEN** el layout renderiza `AppSidebar` con la config de admin (al menos un ítem visible, aunque sea placeholder)

#### Scenario: /app renderiza sidebar
- **WHEN** un usuario `user` navega a `/app`
- **THEN** el layout renderiza `AppSidebar` con la config de app (al menos un ítem visible, aunque sea placeholder)

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
