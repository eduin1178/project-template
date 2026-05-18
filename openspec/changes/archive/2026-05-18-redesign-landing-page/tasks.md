## 1. Auditoría y preparación

- [x] 1.1 Revisar `next-app/content/landing/index.ts` y marcar strings con voseo o con "Organización/Organizaciones" para reescritura.
- [x] 1.2 Confirmar lista final de características reales vs. roadmap contra specs en `openspec/specs/` (tasks-core, task-checklist, task-documents, task-comments, org-dashboard, workspace-routing, onboarding-task, platform-organization).
- [~] 1.3 Definir y aprobar paleta exacta (hex) para tema claro y oscuro, tipografía y escala tipográfica/espaciado, alineadas a la jerarquía de tres capas (institucional / SaaS-edu / cálido humano). — **Omitido por decisión del usuario:** se reutiliza la paleta actual (`app/globals.css`).

## 2. Tokens visuales y tema

- [~] 2.1 Agregar/actualizar tokens en `next-app/app/globals.css` para colores nuevos (primario, acento cálido, neutros, foreground/background extendidos) en variantes light y dark. — **Omitido:** se mantiene la paleta actual.
- [~] 2.2 Confirmar que todas las clases existentes resuelven con los nuevos tokens sin romper componentes fuera de la landing (auth, dashboard, super). — **No aplica:** no se cambiaron tokens.
- [~] 2.3 Verificar contraste WCAG AA (≥4.5:1 texto normal, ≥3:1 texto grande) en ambos temas para combinaciones de fondo/texto usadas en la landing. — Pendiente para QA manual; los tokens reutilizados ya cumplen en el resto del producto.

## 3. Activos visuales nuevos

- [~] 3.1 Producir asset hero (captura del dashboard real) en variantes `hero.png` / `hero-dark.png`. — **Diferido:** se reutiliza `dashboard.png` / `dashboard-dark.png` existentes.
- [~] 3.2 Producir asset "vista de tarea con checklist + comentarios + documentos" en variantes light/dark. — **Diferido:** `ShowcaseFrame` en `product-showcase.tsx` muestra un placeholder accesible mientras llegan los assets.
- [~] 3.3 Producir asset "vista mobile del docente" en variantes light/dark. — **Diferido:** placeholder en `ShowcaseFrame`.
- [~] 3.4 Producir asset "dashboard de cumplimiento de la institución" en variantes light/dark. — **Diferido:** placeholder en `ShowcaseFrame`.
- [~] 3.5 Producir diagrama plano del flujo Rector → Coordinador → Docente (SVG preferido) en variantes light/dark. — **Diferido.**
- [~] 3.6 Seleccionar foto humana stock para sección "Para quién es" alineada al tono cálido humano (no genérica corporativa). — **Diferido:** se usa tratamiento de iconos + tarjeta destacada para el rol central.
- [~] 3.7 Producir pattern decorativo de fondo para Hero y CTA final (SVG) en variantes light/dark. — **Resuelto en CSS:** patrones de puntos/grid generados con utilidades Tailwind v4 (`bg-[radial-gradient(...)]`).
- [~] 3.8 Colocar todos los assets en `next-app/public/images/` siguiendo la convención `nombre.png` + `nombre-dark.png`. — **Diferido** hasta que existan los assets reales.

## 4. Copy actualizado en `content/landing/index.ts`

- [x] 4.1 Reescribir `siteContent.nav` y `siteContent.hero` (titular, subtítulo, CTAs, alt de imagen) con copy alineado a la realidad del producto y tono "tú" neutral.
- [x] 4.2 Reescribir `painsContent` removiendo voseo y manteniendo seis dolores reconocibles.
- [x] 4.3 Reescribir `howItWorksContent` ajustando descripciones a "tú" neutral.
- [x] 4.4 Actualizar `featuresContent.items` para incluir como mínimo: Tareas con criterios claros, Plazos visibles, Roles y permisos, Notificaciones por correo, Reportes y métricas (dashboard de cumplimiento), Comentarios en contexto, Checklist por tarea, Documentos adjuntos por tarea, Workspace multi-institución por slug, Onboarding guiado. Remover características no implementadas.
- [x] 4.5 Reescribir `audiencesContent` con "tú" neutral, manteniendo Rector / Coordinador / Docente y refinando taglines.
- [x] 4.6 Crear `productShowcaseContent` (nueva constante exportada) con título, subtítulo y al menos tres bloques `{ title, description, image, imageDark, alt }`.
- [x] 4.7 Reescribir `benefitsContent` con "tú" neutral.
- [x] 4.8 Reescribir `securityContent` con "tú" neutral y referencia a control de acceso por rol real (super_admin / admin / member traducido a Rector / Coordinador / Docente para el visitante).
- [x] 4.9 Renombrar `integrationsContent` → `roadmapContent`; reescribir copy etiquetando cada item con "Próximamente"; asegurar incluir Google Workspace, Microsoft 365, calendarios externos y notificaciones in-app/push.
- [x] 4.10 Reescribir `socialProofContent` manteniendo testimonios ilustrativos con "tú" neutral y aclaración honesta de que son ejemplos.
- [x] 4.11 Reescribir `pricingContent` con "tú" neutral; mantener tres planes "a medida".
- [x] 4.12 Reescribir `faqContent` removiendo voseo ("podés exportar" → "puedes exportar", etc.).
- [x] 4.13 Reescribir `finalCtaContent` con "tú" neutral.
- [x] 4.14 Reescribir `footerContent.description` con "tú" neutral; agregar entrada a "Roadmap" en lugar de "Integraciones" si aplica.
- [x] 4.15 Reescribir `requestDemoForm` corrigiendo `errorGeneric` ("intentá" → "intenta") y revisando todas las labels/placeholders.
- [x] 4.16 Buscar y reemplazar cualquier "Organización/organización/Organizaciones/organizaciones" en strings visibles por "Institución/institución/Instituciones/instituciones".

## 5. Componentes de la landing

- [x] 5.1 Crear `next-app/components/landing/product-showcase.tsx` que consuma `productShowcaseContent`, renderizando bloques con `next/image` (placeholder blur, dimensiones explícitas, AVIF/WebP) y variantes light/dark vía `next-themes`. — **Nota:** mientras llegan los assets, el componente usa un `ShowcaseFrame` accesible con `role="img"` + `aria-label`; cuando los assets estén disponibles, sustituir el frame por `<Image>` (variantes light/dark ya están listas en `productShowcaseContent`).
- [x] 5.2 Renombrar (`git mv`) `next-app/components/landing/integrations.tsx` → `roadmap.tsx`; actualizar export name a `Roadmap`; agregar badge "Próximamente" por item usando `Badge` de shadcn.
- [x] 5.3 Actualizar `hero.tsx` para usar el nuevo asset hero con variante dark, pattern decorativo de fondo y respetar nueva jerarquía tipográfica. — Pattern de puntos + glow detrás del frame + badges de confianza añadidos; reutiliza `dashboard*.png` hasta que llegue el hero dedicado.
- [x] 5.4 Actualizar `features.tsx` para reflejar el nuevo grid (mínimo grid 3x3 en desktop, 2 cols en tablet, 1 col en móvil) con iconos Phosphor consistentes.
- [x] 5.5 Actualizar `audiences.tsx` para aplicar la capa "cálido humano" (foto humana opcional o acento de color en las cards). — Tarjeta central destacada con ring y escalado; iconos por rol agregados.
- [x] 5.6 Actualizar `security.tsx`, `pricing.tsx`, `faq.tsx`, `final-cta.tsx`, `footer.tsx` para los nuevos tokens visuales. — Hover states, border + plan recomendado con badge, FAQ envuelto en card, CTA final con gradiente + pattern.
- [x] 5.7 Actualizar `social-proof.tsx` aplicando capa cálida; mantener nota de "testimonios ilustrativos".
- [x] 5.8 Asegurar que todos los componentes de sección permanecen como Server Components excepto `auth-cta.tsx`, `request-demo-*` y `faq.tsx`.

## 6. Composición de la página

- [x] 6.1 Editar `next-app/app/page.tsx` para reflejar el orden: Hero → Pains → HowItWorks → Features → Audiences → ProductShowcase → Benefits → Security → Roadmap → SocialProof → Pricing → Faq → FinalCta → Footer.
- [x] 6.2 Verificar que `RequestDemoProvider` y `RequestDemoDialog` siguen envolviendo correctamente la página y que el botón "Solicitar demo" en navbar, hero, planes y CTA final abre el diálogo.

## 7. Accesibilidad y performance

- [~] 7.1 Validar navegación por teclado en toda la landing: orden de Tab lógico, foco visible en todos los interactivos (links, botones, inputs, acordeón). — **Pendiente QA manual** en el navegador.
- [~] 7.2 Validar que toda imagen informativa tiene `alt` descriptivo y las puramente decorativas tienen `alt=""`. — Texto `alt` definido en `productShowcaseContent` y `siteContent.hero.image`; `ShowcaseFrame` usa `role="img" + aria-label`; patrones decorativos llevan `aria-hidden`.
- [~] 7.3 Ejecutar Lighthouse en producción local sobre `/` y confirmar LCP <2.5s en 4G simulado. — **Pendiente QA.**
- [~] 7.4 Validar que no hay scroll horizontal en viewports de 320px y que la jerarquía sigue legible en 1920px. — **Pendiente QA.**
- [~] 7.5 Validar que el cambio de tema (`next-themes`) actualiza correctamente las capturas y el resto de la landing sin contraste roto. — **Pendiente QA.**

## 8. Limpieza y verificación

- [x] 8.1 Buscar en `next-app/components/landing/**` y `next-app/content/landing/**` cualquier voseo residual o "Organización" en strings visibles y corregir.
- [x] 8.2 Verificar que ningún componente nuevo introduce paquetes fuera del stack permitido (no `lucide-react`, no `@radix-ui/react-*` individuales). — Solo `@phosphor-icons/react/dist/ssr` y primitivas en `components/ui/`.
- [~] 8.3 Ejecutar `openspec verify-change redesign-landing-page` (o equivalente) y resolver hallazgos antes de pedir review. — **Pendiente.**
- [~] 8.4 Documentar en el PR los assets nuevos agregados a `public/images/` y los cambios visuales clave. — **Pendiente PR.**

---

### Leyenda

- `[x]` Hecho en este apply.
- `[~]` Diferido o pendiente de QA / decisión externa, no bloquea el merge funcional de copy + estructura.
