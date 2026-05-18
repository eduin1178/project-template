## Why

La landing page actual se construyó al inicio del proyecto y quedó desalineada con la realidad del producto: omite capacidades ya construidas (checklist por tarea, documentos adjuntos, dashboard de cumplimiento, workspace por slug, onboarding guiado, panel plataforma), promete capacidades que aún no existen (integraciones Google/Microsoft, notificaciones multi-canal) y contiene copy con voseo que viola la convención de español neutral del proyecto. El visual depende de una única captura (`dashboard.png`) y no proyecta la propuesta de valor real al decisor institucional.

## What Changes

- Reescribir el copy de todas las secciones de la landing para reflejar las capacidades que el producto entrega HOY.
- Reemplazar la sección "Integraciones" por una sección "Roadmap" que etiquete claramente Google Workspace, Microsoft 365, calendarios y notificaciones in-app/push como próximas.
- Agregar una nueva sección "Captura del producto en acción" entre Audiences y Beneficios, con visuales reales del workspace, vista de tarea (checklist + comentarios + documentos) y dashboard de cumplimiento.
- Actualizar el grid de Características para incluir Checklist por tarea, Documentos adjuntos, Dashboard de cumplimiento, Onboarding guiado y Multi-institución por slug; remover o reformular características no implementadas.
- Refrescar el sistema visual de la landing aplicando una jerarquía de tres capas (institucional sobrio como base, SaaS-edu moderno para producto, cálido humano para personas y CTA), con paleta, tipografía y escalas tokenizadas.
- Planificar y producir 7 nuevos visuales (hero, vista de tarea, vista mobile docente, dashboard de cumplimiento, diagrama de flujo de roles, foto humana, pattern decorativo) con variantes light/dark y formatos modernos.
- Corregir todo el copy con voseo y regionalismos para alinearse a "tú" neutral y al vocabulario "Institución".
- Mover el copy actualizado a `next-app/content/landing/index.ts` manteniendo la convención de constantes tipadas exportadas por sección.
- **BREAKING (visual/copy):** la landing pública cambia de aspecto y mensaje; no hay impacto en datos ni en autenticación.

## Capabilities

### New Capabilities
<!-- Sin nuevas capabilities: este cambio actualiza una capability existente. -->

### Modified Capabilities
- `landing-page`: ajustar requisitos sobre orden de secciones (nueva sección "Captura del producto en acción", renombrar/reformular "Integraciones" → "Roadmap"), sobre catálogo de características visibles (alinearlo a la funcionalidad real del producto), sobre tono y vocabulario del copy (prohibir voseo, exigir "Institución" en lugar de "Organización" en texto visible) y sobre activos visuales requeridos (set de capturas y diagramas nuevos con variantes light/dark).

## Impact

- **Código afectado**:
  - `next-app/app/page.tsx` (composición de secciones).
  - `next-app/components/landing/*` (markup y composición de cada sección; nueva sección de captura de producto; renombrado de `integrations.tsx` a sección "roadmap" o nuevo componente).
  - `next-app/content/landing/index.ts` (copy completo).
- **Activos nuevos** en `next-app/public/images/`: hero, vista de tarea, vista mobile docente, dashboard de cumplimiento, diagrama de roles, foto humana, pattern decorativo (cada uno con variante dark cuando aplique).
- **Dependencias**: sin paquetes nuevos. Mantiene Next.js 16, React 19, Tailwind v4, shadcn/ui, Radix umbrella, Phosphor Icons, `next-themes`, `react-hook-form`, `zod`.
- **APIs**: sin cambios. `POST /api/demo-request` se mantiene como stub.
- **Specs**: actualiza `openspec/specs/landing-page/spec.md`.
- **Sin impacto** en base de datos, autenticación, routing por slug, ni en `/super`.
