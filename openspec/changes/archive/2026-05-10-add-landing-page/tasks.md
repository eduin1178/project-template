## 1. Preparación y solicitud de assets

- [x] 1.1 Solicitar al usuario: logo Docentix (SVG light/dark), paleta de marca o semilla de color, imagen del hero (o brief para generarla), avatares/logos de prueba social, correo de contacto del footer, output CSS del constructor externo de tema (TweakCN o equivalente)
- [x] 1.2 Confirmar con el usuario: ¿modo claro/oscuro con toggle, solo claro, o `prefers-color-scheme` automático? ¿Integraciones se muestran como "Próximamente"?
- [x] 1.3 Crear `next-app/AGENTS.md` (o anexar a CLAUDE.md existente) con la regla "shadcn-first: prohibido duplicar primitivas de shadcn con componentes custom"

## 2. Fundación shadcn/ui manual (capability `ui-foundation`)

- [x] 2.1 Instalar dependencias base: `clsx tailwind-merge class-variance-authority lucide-react tailwindcss-animate`
- [x] 2.2 Crear `next-app/lib/utils.ts` con la utilidad `cn`
- [x] 2.3 Crear `next-app/components.json` configurado manualmente (style, tailwind paths, alias `@/components`, `@/lib`, `@/components/ui`, `@/lib/utils`, `@/hooks`, `tsx: true`)
- [x] 2.4 Configurar alias `@/*` en `tsconfig.json` apuntando a la raíz de `next-app`
- [x] 2.5 Pegar el CSS del constructor externo en `next-app/app/globals.css` (o `styles/globals.css`) bajo `:root` y `.dark`, manteniendo las directivas Tailwind v4 (`@import "tailwindcss"`, `@theme inline`, capas)
- [x] 2.6 Validar tema con primitiva piloto: instalar manualmente `components/ui/button.tsx` (código canónico de shadcn) y renderizar en una página de prueba; verificar visualmente que los tokens del tema externo se aplican
- [x] 2.7 Instalar manualmente las primitivas shadcn restantes que la landing usará: `dialog`, `sheet`, `accordion`, `form`, `input`, `textarea`, `select`, `label`, `card`, `badge`, `separator`, `navigation-menu`, `dropdown-menu`
- [x] 2.8 Instalar `react-hook-form zod @hookform/resolvers` para el formulario

## 3. Contrato de autenticación (capability `auth-status-contract`)

- [x] 3.1 Crear `next-app/lib/auth/use-auth-status.ts` con la directiva `"use client"`, exportando el tipo `AuthStatus` (discriminated union: loading/unauthenticated/authenticated) y el hook `useAuthStatus`
- [x] 3.2 Implementar el stub v1 del hook: retorna síncronamente `{ status: 'unauthenticated' }`
- [x] 3.3 Documentar en JSDoc del archivo que la implementación real llegará en una spec futura de autenticación, y que el contrato es estable

## 4. Contenido (constantes por sección)

- [x] 4.1 Crear `next-app/content/landing/` con un archivo por sección y tipos TS exportados
- [x] 4.2 `hero.ts`: titular (promesa), subtítulo, texto del CTA primario, alt de la imagen
- [x] 4.3 `pains.ts`: lista de 4-6 dolores frecuentes en instituciones educativas (tareas dispersas en WhatsApp, falta de seguimiento, plazos incumplidos, etc.)
- [x] 4.4 `how-it-works.ts`: 3-4 pasos (definir tarea → asignar con plazo → seguimiento → entrega/cierre)
- [x] 4.5 `features.ts`: 6-9 features con icono (de lucide), título y descripción breve
- [x] 4.6 `audiences.ts`: 3 cards (Rector, Coordinador, Docente) con propuesta de valor por rol
- [x] 4.7 `benefits.ts`: lista de beneficios cuantificables/cualitativos
- [x] 4.8 `integrations.ts`: integraciones futuras marcadas como "Próximamente" si así se confirmó en 1.2 (Google Workspace, Microsoft 365, correo institucional)
- [x] 4.9 `security.ts`: bullets de seguridad/privacidad (cifrado en tránsito, control de acceso por rol, manejo responsable de datos de la comunidad educativa)
- [x] 4.10 `social-proof.ts`: estructura para 3-5 testimonios o logos institucionales (placeholders con nombre + cargo + institución de relleno)
- [x] 4.11 `pricing.ts`: 3 planes de relleno (Básico / Institucional / Enterprise) con CTA "Solicitar demo" en cada uno, sin precios reales
- [x] 4.12 `faq.ts`: 5-7 preguntas frecuentes con respuestas de relleno coherentes
- [x] 4.13 `final-cta.ts`: titular de cierre + CTA "Solicitar demo"
- [x] 4.14 `footer.ts`: enlaces (Privacidad, Términos, Contacto), redes sociales si aplica, copyright dinámico

## 5. Validación compartida y endpoint stub

- [x] 5.1 Crear `next-app/lib/validation/demo-request.ts` con el zod schema (`fullName`, `institutionalEmail`, `institutionName`, `role`, `teacherCount`, `message?`) y tipo inferido
- [x] 5.2 Crear `next-app/app/api/demo-request/route.ts` (route handler `POST`) que valide el body con el schema y responda 200/400 sin persistir
- [x] 5.3 Verificar respuesta 200 con payload válido y 400 con payload inválido (curl o navegador)

## 6. Componentes de composición — secciones (capability `landing-page`)

- [x] 6.1 `components/landing/logo.tsx` (RSC) — placeholder con SVG inline o `next/image` según asset recibido en 1.1
- [x] 6.2 `components/landing/navbar.tsx` (RSC, sticky, top-0, z-index alto) — incluye Logo, AuthCta, RequestDemoButton; en móvil mantiene ambos CTAs visibles
- [x] 6.3 `components/landing/auth-cta.tsx` (`"use client"`) — usa `useAuthStatus`, renderiza Button shadcn con label dinámico ("Iniciar sesión" / "Ir al Dashboard" / skeleton)
- [x] 6.4 `components/landing/request-demo-provider.tsx` (`"use client"`) — context con `open()`/`close()` para el Dialog único de la landing
- [x] 6.5 `components/landing/request-demo-button.tsx` (`"use client"`) — Button shadcn que invoca `open()` del provider
- [x] 6.6 `components/landing/request-demo-dialog.tsx` (`"use client"`) — Dialog shadcn montado una sola vez; contiene `RequestDemoForm`
- [x] 6.7 `components/landing/request-demo-form.tsx` (`"use client"`) — react-hook-form + zod resolver + primitivas Form de shadcn; envía POST a `/api/demo-request`; muestra estado de envío y mensaje de éxito/error
- [x] 6.8 `components/landing/hero.tsx` (RSC) — titular, subtítulo, CTAs (primario abre Dialog vía RequestDemoButton, secundario ancla a `#how-it-works`), imagen con `next/image` (`priority`, `placeholder="blur"`, `sizes`)
- [x] 6.9 `components/landing/pains.tsx` (RSC)
- [x] 6.10 `components/landing/how-it-works.tsx` (RSC) — 3-4 pasos numerados
- [x] 6.11 `components/landing/features.tsx` (RSC) — grid con iconos de lucide
- [x] 6.12 `components/landing/audiences.tsx` (RSC) — 3 Cards shadcn (Rector / Coordinador / Docente)
- [x] 6.13 `components/landing/benefits.tsx` (RSC)
- [x] 6.14 `components/landing/integrations.tsx` (RSC) — con badges "Próximamente" si se confirmó
- [x] 6.15 `components/landing/security.tsx` (RSC)
- [x] 6.16 `components/landing/social-proof.tsx` (RSC) — testimonios y/o logos
- [x] 6.17 `components/landing/pricing.tsx` (RSC) — 3 Cards con CTAs que abren el Dialog
- [x] 6.18 `components/landing/faq.tsx` (`"use client"` si Radix Accordion lo requiere) — Accordion shadcn
- [x] 6.19 `components/landing/final-cta.tsx` (RSC) — banner con titular y RequestDemoButton
- [x] 6.20 `components/landing/footer.tsx` (RSC) — links, copyright con `new Date().getFullYear()`

## 7. Página y layout

- [x] 7.1 Configurar `next-app/app/layout.tsx`: importar `globals.css`, fuente vía `next/font` con `display: 'swap'`, lang="es", metadata (title, description, OG tags básicos)
- [x] 7.2 Implementar `next-app/app/page.tsx` (RSC) componiendo en orden: `RequestDemoProvider` envolviendo a `Navbar` + secciones + `Footer` + `RequestDemoDialog`
- [x] 7.3 Definir IDs de ancla para las secciones (`#how-it-works`, `#features`, `#pricing`, `#faq`, etc.) para enlaces internos

## 8. Accesibilidad, performance y verificación

- [x] 8.1 Auditar contraste de todas las combinaciones de texto/fondo con axe DevTools (objetivo: 0 violations AA)
- [x] 8.2 Navegar la página completa solo con teclado: verificar foco visible y orden lógico
- [x] 8.3 Verificar `alt` en todas las imágenes informativas y `alt=""` en decorativas
- [x] 8.4 Ejecutar `npm run build` y `npm run start`, correr Lighthouse móvil — confirmar LCP < 2.5s y score Accessibility ≥ 95
- [x] 8.5 Probar responsive en 320px, 375px, 768px, 1024px, 1440px — verificar que no hay scroll horizontal y que la navbar mantiene CTAs visibles
- [x] 8.6 Probar flujo end-to-end del formulario: abrir desde 3 CTAs distintos, validación inválida, envío válido, mensaje de éxito

## 9. Cierre

- [x] 9.1 Ejecutar `npm run lint` y resolver cualquier warning
- [x] 9.2 Verificar que no hay strings de copy hardcodeados en JSX (todos provienen de `content/landing/`)
- [x] 9.3 Verificar que no hay primitivas duplicadas (no hay `<button>` con clases sueltas donde corresponde `Button` de shadcn)
- [x] 9.4 Anotar en la PR las decisiones honestas: endpoint stub sin persistencia, registro solo por invitación, integraciones como "Próximamente"
