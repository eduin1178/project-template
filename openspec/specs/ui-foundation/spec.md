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
