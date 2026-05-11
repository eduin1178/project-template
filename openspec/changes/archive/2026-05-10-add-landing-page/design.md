## Context

Docentix arranca como un proyecto Next.js 16 + React 19 + Tailwind v4 vacío. Esta change es la **primera spec del repositorio**, por lo que además de la landing establece tres pilares que el resto del producto reutilizará:

1. El sistema de componentes (shadcn/ui instalado manualmente con tema externo).
2. La convención de carpetas para composición y contenido.
3. El contrato del estado de autenticación que la app entera consumirá.

El cliente objetivo son instituciones educativas; el decisor es el rector y los usuarios diarios son coordinadores y docentes. La landing debe convertir visitantes en solicitudes de demo (B2B asistido) y permitir el reingreso de usuarios ya invitados. No hay backend todavía: el formulario se sostiene con un endpoint stub.

Restricciones relevantes:

- **Next.js 16 / React 19** → uso de RSC por defecto; cliente solo donde haga falta estado o hooks.
- **Tailwind v4** → configuración basada en `@theme` y variables CSS, sin `tailwind.config.js` clásico.
- **shadcn/ui manual** → no se usa `npx shadcn init` con defaults; el tema viene de un constructor externo (TweakCN / shadcn theme builder o similar) que entrega variables CSS ya tokenizadas.
- **Sin assets propios todavía** → logo, ilustración del hero, avatares y logos institucionales se solicitarán durante implementación.

## Goals / Non-Goals

**Goals:**

- Landing pública en `/` estática, mobile-first, accesible (WCAG AA) y rápida (LCP < 2.5s en 4G).
- Adopción de shadcn/ui manual con tema externo preservado, estableciendo la regla "shadcn-first".
- Contrato `useAuthStatus()` estable que aísla la landing del sistema de auth futuro.
- Contenido de relleno coherente, centralizado en constantes tipadas, listo para iteración y futura i18n.
- Formulario funcional de "Solicitar demo" con validación cliente y endpoint stub.

**Non-Goals:**

- Implementar autenticación real (login, sesiones, JWT, etc.) — la spec solo expone el contrato del hook.
- Persistir las solicitudes de demo (el endpoint stub responde 200 sin guardar nada).
- Multi-idioma operativo en v1 (solo español; la estructura queda lista para i18n).
- Dashboard, rutas privadas, lógica de roles — fuera de scope.
- Animaciones complejas o librerías de motion (puede haber transiciones CSS sutiles, nada más).
- Auto-registro público o flujo de creación de cuenta desde la landing.
- SEO avanzado (sitemap dinámico, structured data complejo) — sí metadata básica y OG tags.

## Decisions

### D1. Rendering: RSC estática + islas cliente puntuales

`app/page.tsx` es Server Component. Las únicas islas cliente son:

- `<AuthCta />` (botón Login/Dashboard que consume `useAuthStatus`).
- `<RequestDemoDialog />` y `<RequestDemoForm />` (formulario con `react-hook-form` + `zod`).
- `<FaqAccordion />` solo si la primitiva de shadcn requiere cliente (Radix Accordion sí necesita `"use client"`).

**Alternativa descartada:** SSR por request — no aporta valor para contenido inmutable y degrada caché.

**Por qué:** mejor performance (HTML pre-renderizado, hidratación mínima) y menor bundle.

### D2. shadcn/ui manual con tema externo

Se instala shadcn pieza por pieza:

1. Dependencias: `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `tailwindcss-animate` (si el tema lo requiere), `@radix-ui/*` según cada primitiva.
2. `components.json` escrito a mano con paths y `tsx: true`.
3. `lib/utils.ts` con `cn`.
4. `styles/globals.css` con las variables CSS exportadas por el constructor externo (las pega el implementador; el constructor las provee).
5. Las primitivas se copian/escriben en `components/ui/*.tsx` siguiendo el código canónico de shadcn, sin alterar el sistema de tokens.

**Alternativa descartada:** `npx shadcn init` con preset `default`/`new-york`. Eso sobrescribe los tokens del tema externo o exige hacer merge a mano de todas formas. Instalación manual es más explícita y deja menos margen para que el agente del futuro "actualice" el tema con `shadcn add` y rompa el branding.

**Por qué:** preservar el tema del constructor externo es una restricción dura del usuario.

### D3. Regla "shadcn-first" como convención del proyecto

Cualquier primitiva que shadcn ofrezca SHALL usarse desde `components/ui/`. Componer en `components/landing/` está permitido; duplicar primitivas no. Esto se documenta en `AGENTS.md` o `CLAUDE.md` del proyecto next-app para futuros agentes/devs.

**Trade-off:** lock-in suave con shadcn/Radix. Mitigación: shadcn copia código al repo (no es dependencia opaca), siempre se puede forkear una primitiva.

### D4. Contrato `useAuthStatus()` con discriminated union

```ts
type AuthStatus =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; dashboardHref: string };
```

En v1 retorna síncronamente `{ status: 'unauthenticated' }`. Cuando llegue la spec de auth, el hook se conecta a la fuente real (cookies HttpOnly + verificación server, o `next-auth`/`auth.js`, según se decida). El consumidor `<AuthCta />` no cambia.

**Alternativa descartada:** booleano `isAuthenticated`. Pierde el estado `loading` que será necesario cuando la verificación pase a ser asíncrona.

**Por qué:** discriminated unions permiten exhaustividad en TS y agregan `loading` sin breaking change futuro.

### D5. Formulario con react-hook-form + zod + shadcn Form

Stack estándar de shadcn para formularios. Validación en cliente con zod schema; el mismo schema se reusa en el endpoint API stub para validar el payload del servidor.

**Por qué:** un solo schema, dos validaciones (cliente y servidor), tipo inferido por TS.

### D6. Endpoint stub `POST /api/demo-request`

Route handler en `app/api/demo-request/route.ts`. Valida el body con el zod schema compartido; si pasa, retorna `200 { ok: true }`; si falla, `400` con errores. **No persiste nada.** Cuando exista backend, esta ruta se conecta a la persistencia real (DB o servicio de CRM/email).

**Trade-off:** el formulario "parece" funcionar pero no captura leads. Mitigación: en implementación, el usuario decide si quiere agregar un envío por email (Resend / nodemailer) o dejar el stub puro. Para v1 con contenido de relleno, stub es suficiente y honesto.

### D7. Contenido en `content/landing/*.ts`

Un archivo por sección (`hero.ts`, `pains.ts`, `how-it-works.ts`, `features.ts`, `audiences.ts`, `benefits.ts`, `integrations.ts`, `security.ts`, `social-proof.ts`, `pricing.ts`, `faq.ts`, `final-cta.ts`, `footer.ts`) exportando objetos tipados. Esto:

- Mantiene componentes JSX limpios de strings.
- Hace fácil iterar copy con stakeholders no técnicos.
- Es la base estructural para i18n futura: envolver cada objeto en `{ es: {...}, en: {...} }` cuando llegue.

**Alternativa descartada:** archivos `.md` o `.mdx` para el copy. Sobrecargado para v1; objetos TS dan tipos y autocompletado.

### D8. Estructura de carpetas dentro de `next-app/`

```
app/
  api/demo-request/route.ts
  layout.tsx
  page.tsx
components/
  ui/                       # shadcn (manual)
    button.tsx, dialog.tsx, accordion.tsx, ...
  landing/                  # composiciones de la landing
    navbar.tsx (RSC)
    auth-cta.tsx (client)
    hero.tsx
    pains.tsx
    how-it-works.tsx
    features.tsx
    audiences.tsx
    benefits.tsx
    integrations.tsx
    security.tsx
    social-proof.tsx
    pricing.tsx
    faq.tsx (client si Accordion lo requiere)
    final-cta.tsx
    footer.tsx
    request-demo-dialog.tsx (client)
    request-demo-form.tsx (client)
content/
  landing/
    hero.ts, pains.ts, ... (un archivo por sección)
lib/
  utils.ts                  # cn
  auth/
    use-auth-status.ts      # contrato + stub
  validation/
    demo-request.ts         # zod schema compartido
styles/
  globals.css               # tokens del tema externo + tailwind v4
```

### D9. Diagrama de composición de la landing

```
app/page.tsx (RSC)
└── <Navbar/> (RSC)
│   ├── <Logo/>
│   └── <AuthCta/> (client) ──── useAuthStatus()
│   └── <RequestDemoButton/> (client) ── abre Dialog
├── <Hero/> (RSC)
│   └── CTA primario abre <RequestDemoDialog/>
├── <Pains/>
├── <HowItWorks/>
├── <Features/>
├── <Audiences/>          (Rector / Coordinador / Docente)
├── <Benefits/>
├── <Integrations/>
├── <Security/>
├── <SocialProof/>
├── <Pricing/>
├── <Faq/> (client si Accordion lo requiere)
├── <FinalCta/>
├── <Footer/>
└── <RequestDemoDialog/> (client, montado a nivel page para que cualquier
                          CTA lo abra vía contexto/store ligero o señal global)
```

Para coordinar la apertura del Dialog desde múltiples CTAs (navbar, hero, pricing cards, final CTA) sin prop-drilling: usar un `useState` en un cliente `<RequestDemoProvider>` que envuelva las secciones donde aparecen los botones, exponiendo `open()` por contexto. Alternativa simple: cada botón monta su propio `<Dialog>` local — más markup pero cero coordinación. Decisión: **provider con contexto** (un solo Dialog montado, mejor accesibilidad y performance).

### D10. Performance budget

- Imagen del hero: `next/image`, AVIF/WebP, `priority`, `sizes` correctos, `placeholder="blur"` con blur data URL.
- Fuente: una sola familia vía `next/font` con `display: 'swap'` y subset latino.
- Sin librerías de animación pesadas.
- Verificación: Lighthouse local en build de producción debe reportar LCP < 2.5s en preset móvil 4G.

## Risks / Trade-offs

- **[Riesgo] El tema externo del constructor no es compatible con la versión de shadcn que copiemos** → Mitigación: la implementación valida en una primitiva piloto (Button) que el tema renderiza correctamente ANTES de copiar el resto. Si hay incompatibilidad, se ajustan las variables o se actualiza la primitiva al template que coincida con el output del constructor.
- **[Riesgo] Tailwind v4 todavía es reciente; algunos snippets de shadcn están escritos para Tailwind v3** → Mitigación: usar la rama/branch de shadcn/ui compatible con Tailwind v4 (existe documentación oficial). Si una primitiva da problemas, ajustar clases al modelo v4 (`@theme`, sin `darkMode: 'class'` configurable).
- **[Riesgo] El endpoint stub puede dar falsa sensación de "lead capturado"** → Mitigación: el copy del mensaje de éxito SHALL ser honesto ("Recibimos tu solicitud, te contactaremos pronto" implica acción humana, no automatización). En la nota de la PR se deja explícito que la persistencia es spec futura.
- **[Riesgo] Centralizar el copy en TS hace que cambios menores generen rebuilds completos** → Trade-off aceptado: el beneficio para mantenimiento e i18n supera el costo en una landing estática.
- **[Riesgo] Provider de contexto para el Dialog implica que toda la landing es "casi cliente"** → Mitigación: el provider envuelve únicamente las islas que necesitan abrir el Dialog (no toda la página). Las secciones de contenido permanecen RSC.
- **[Riesgo] WCAG AA en una landing nueva sin testing automático puede tener regresiones** → Mitigación: la fase de implementación incluye una pasada manual con axe DevTools y navegación por teclado, documentada en la PR.

## Migration Plan

No aplica como migración tradicional — es la primera feature del proyecto. Plan de despliegue:

1. Mergear la PR a `main`.
2. `npm run build` debe pasar sin warnings.
3. Smoke test manual: cargar `/`, abrir/cerrar Dialog, enviar formulario válido e inválido.
4. Lighthouse en build de producción.
5. Rollback: revertir el commit; no hay estado persistido que migrar.

## Open Questions

- **¿Qué constructor externo de tema se está usando?** (TweakCN, shadcn theme builder oficial, otro) — el implementador necesita el output CSS al momento de la fase de UI foundation. Si no está listo, se usa un tema neutro temporal y se reemplaza después.
- **¿Hay paleta de marca definida para Docentix (primario, secundario, acento)?** — si no, el constructor genera una basada en una semilla; se pide al usuario en implementación.
- **¿El correo de contacto del footer es real o placeholder?** — se solicita en implementación.
- **¿Las "integraciones" que se mencionan (Google Classroom, correo institucional) deben mostrarse como "Próximamente" o como features actuales?** — recomendación: marcar "Próximamente" para no prometer lo que no existe. Confirmar en implementación.
- **¿Se quiere modo claro/oscuro funcional o solo claro en v1?** — el tema externo probablemente incluye ambos; decidir si exponer un toggle en navbar o dejar `prefers-color-scheme` automático.
