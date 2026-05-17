## Context

La landing pública vive en `/` (`next-app/app/page.tsx`) y compone secciones desde `components/landing/*` con copy centralizado en `content/landing/index.ts`. El stack disponible es Next.js 16, React 19, Tailwind v4, shadcn/ui sobre `components/ui/`, Radix umbrella, Phosphor Icons, `next-themes` y `react-hook-form` + `zod` para el formulario "Solicitar demo". El producto real ya soporta workspace por slug (`/[slug]/...`), tareas con checklist, comentarios y documentos adjuntos, dashboard de cumplimiento, onboarding guiado, multi-institución y panel plataforma; la landing actual omite buena parte de eso, promete integraciones que no existen y mezcla voseo en el copy.

## Goals / Non-Goals

**Goals:**
- Alinear el contenido de la landing a la funcionalidad real del producto hoy.
- Sustituir "Integraciones" por una sección "Roadmap" con expectativas honestas.
- Introducir una sección visual fuerte "Captura del producto en acción".
- Aplicar una identidad visual coherente en tres capas (institucional sobrio · SaaS-edu moderno · cálido humano) usando tokens de Tailwind v4 y tema claro/oscuro.
- Producir los activos visuales nuevos con variantes light/dark y dimensiones explícitas servidas por `next/image`.
- Eliminar voseo y reemplazar "Organización" por "Institución" en todo el copy visible.
- Mantener accesibilidad WCAG 2.1 AA y LCP <2.5s en 4G.

**Non-Goals:**
- Reemplazar shadcn/ui, Radix o Phosphor Icons.
- Introducir nuevas dependencias de UI, animación o iconografía.
- Cambiar la API `POST /api/demo-request` (sigue siendo stub).
- Modificar autenticación, routing por slug o cualquier ruta protegida.
- Construir realmente las integraciones (Google/Microsoft/calendarios) — solo aparecen como roadmap.
- Internacionalización efectiva (se mantiene español único; estructura de constantes ya permite envoltura futura en diccionarios).
- Cambiar el modelo de cuentas (sigue siendo solo por invitación).

## Decisions

### 1. Sistema visual en tres capas, no tres estilos paralelos
La paleta y tipografía bases son "institucional sobrio" (azul/verde profundo, neutros, mucho blanco). Sobre esa base se monta "SaaS-edu moderno" exclusivamente en las secciones de producto (Hero, Cómo funciona, Características, Captura del producto, Dashboard). El acento "cálido humano" se reserva para Audiences, Prueba social y CTA final (ámbar/coral apagado para CTAs y bordes).

**Por qué:** evita que el rediseño se sienta inconsistente; cada capa cumple una función comunicacional distinta y no compite por atención.

**Alternativas consideradas:**
- Solo institucional sobrio → más confiable pero frío; pierde el atractivo SaaS para Coordinadores.
- Solo SaaS-edu moderno → sensación de producto vivo pero menos serio frente a decisores conservadores.

### 2. Captura del producto como contenido, no como decoración
La nueva sección "Captura del producto en acción" se trata como contenido autocontenido (texto explicativo corto + imagen grande + caption por captura), no como un mero showcase visual. Va entre "Para quién es" y "Beneficios" para que el lector ya tenga marco mental cuando ve la UI.

**Por qué:** convertir capturas en argumento de venta exige contexto verbal; sin caption, las capturas se vuelven adorno.

**Alternativas consideradas:**
- Carrusel de capturas → impacto visual pero pobre en SEO y accesibilidad.
- Tabs con vista por rol → buena idea pero agrega complejidad de cliente; se difiere a v2.

### 3. Roadmap reemplaza Integraciones con badge "Próximamente"
La sección antes llamada "Integraciones" se renombra "Roadmap". Cada item lleva un badge visual `Próximamente` y se aclara que no afecta la propuesta core. Se mantienen Google Workspace, Microsoft 365, calendarios externos y se agrega "Notificaciones in-app y push".

**Por qué:** la versión actual promete capacidades inexistentes; eso erosiona credibilidad en demo. Honestidad explícita > performance comercial cortoplacista.

**Alternativas consideradas:**
- Eliminar totalmente → pierde señal de que el producto evoluciona.
- Dejar como está → riesgo reputacional ante demos.

### 4. Copy centralizado en `content/landing/index.ts`, sin componentes literarios
Todo el copy nuevo entra como objetos tipados exportados desde `content/landing/index.ts` (manteniendo la convención actual). Los componentes en `components/landing/*` siguen consumiendo el contenido por import; ningún string literal nuevo va en JSX.

**Por qué:** preserva la estructura preparada para i18n y permite editar copy sin tocar JSX (requisito existente de la spec).

### 5. Activos visuales con variantes light/dark y formato moderno
Cada captura/diagrama tiene variante `*-dark` siguiendo la convención actual (`dashboard.png` + `dashboard-dark.png`). Formatos: AVIF/WebP preferido vía `next/image`, fallback PNG; placeholder blur obligatorio; dimensiones explícitas en JSX para evitar layout shift.

**Por qué:** mantiene LCP <2.5s en móviles, evita CLS y consistencia con `next-themes`.

**Alternativas consideradas:**
- SVG ilustrado para todo → más liviano pero pierde realismo de producto.
- Sin variante dark → rompe la consistencia con el tema global.

### 6. Sin nuevas primitivas de UI
Toda interacción usa primitivas ya instaladas: `Dialog` para el formulario demo, `Accordion` para FAQ, `Button`, `Input`, `Select`, `Textarea`, `Card`. Iconografía 100% Phosphor.

**Por qué:** regla del proyecto explícita; reduce superficie de mantenimiento y mantiene coherencia visual.

### 7. RSC por defecto, cliente mínimo
Server Components para todas las secciones estáticas. Marcados `'use client'` solo: `auth-cta.tsx` (consume `useAuthStatus`), `request-demo-dialog.tsx`, `request-demo-form.tsx`, `request-demo-context.tsx`, `faq.tsx` (acordeón interactivo). Resto se mantiene server-side.

**Por qué:** preserva LCP y minimiza JS enviado al cliente.

## Risks / Trade-offs

- **[Riesgo] La nueva sección "Captura del producto" depende de assets que aún no existen.** → Mitigación: planear briefs por captura como entregable del rediseño y bloquear el merge final hasta tener al menos hero + vista de tarea + dashboard.
- **[Riesgo] Cambio de copy puede romper expectativas de leads en pipeline actual.** → Mitigación: el cambio refleja capacidad real; cualquier lead anterior queda mejor servido con un mensaje honesto que con uno inflado.
- **[Riesgo] Renombrar `integrations.tsx` a `roadmap.tsx` (o crear nuevo) afecta historial git.** → Mitigación: preferir `git mv` (rename) o crear nuevo + borrar viejo en mismo commit; documentar en commit message.
- **[Trade-off] La sección "Captura del producto" agrega peso a la página.** → Mitigación: `next/image` con AVIF/WebP, `priority` solo en hero, lazy load en el resto.
- **[Trade-off] Tres capas visuales requieren disciplina del diseñador para no mezclarse.** → Mitigación: documentar en design system qué tokens van en cada capa (paleta institucional vs. acento cálido) y aplicarlo por sección, no por componente suelto.
- **[Riesgo] Voseo persistente en otros archivos del producto (mensajes de error, emails) no entra en este cambio.** → Mitigación: este cambio cubre solo landing + `content/landing/`; cualquier limpieza adicional va como cambio separado.

## Migration Plan

1. Crear/actualizar contenido en `content/landing/index.ts` con copy nuevo (sin tocar componentes).
2. Producir assets visuales nuevos en `public/images/` con variantes light/dark.
3. Crear componente `components/landing/product-showcase.tsx` (nueva sección).
4. Renombrar `components/landing/integrations.tsx` → `components/landing/roadmap.tsx` y reescribir markup con badge "Próximamente".
5. Actualizar componentes de cada sección para consumir el nuevo copy y aplicar los tokens visuales nuevos.
6. Componer en `app/page.tsx` el orden actualizado: Hero → Pains → Cómo funciona → Características → Audiences → Captura del producto → Beneficios → Seguridad → Roadmap → Prueba social → Planes → FAQ → CTA final → Footer.
7. Verificar contraste WCAG AA, navegación por teclado y LCP <2.5s en preview de producción local antes de mergear.
8. **Rollback**: revertir el merge restaura la landing previa; no hay cambios de datos ni de API, por lo que el rollback es de un solo paso.

## Open Questions

- ¿La paleta exacta (hex) la define este cambio o queda como decisión del diseño visual que produzca Claude Design a partir del prompt? → Propuesta: el prompt define principios y restricciones; los tokens finales se eligen y agregan a `app/globals.css` durante la implementación.
- ¿Las fotos humanas usan stock o producción propia? → Para v1, stock seleccionado con criterio (no genérico corporativo); producción propia queda fuera de alcance.
- ¿Mantener "Solicitar demo" o evaluar variantes como "Hablar con ventas" / "Agendar piloto"? → Mantener "Solicitar demo" para no fragmentar el CTA en navbar, hero, planes y CTA final.
