## Why

Docentix necesita una landing page pública en `/` que comunique la propuesta de valor del producto (plataforma para que rectores y coordinadores asignen y administren tareas a docentes con plazos) y capture interés de instituciones educativas vía solicitud de demo. Hoy el proyecto Next.js está vacío: no hay punto de entrada comercial, ni canal de captación, ni forma de iniciar sesión para usuarios existentes. Esta es la primera spec del proyecto y establece la base visual, el sistema de componentes (shadcn/ui) y el contrato de estado de autenticación que reusará el resto de la app.

## What Changes

- Añadir landing page estática (RSC) en la ruta `/` del proyecto `next-app`, mobile-first y accesible (WCAG AA).
- Instalar y configurar **shadcn/ui manualmente** (no vía CLI automática) para preservar el tema definido por un constructor externo. Toda primitiva de UI proviene de shadcn/ui — **prohibido crear componentes personalizados equivalentes** (Button, Input, Card, Accordion, Sheet, Form, Dialog, Badge, etc.) cuando shadcn/ui ya los ofrece.
- Estructura de secciones, en orden: **Navbar sticky** → **Hero** → **Dolores** → **Cómo funciona** (3-4 pasos) → **Características** (grid) → **Para quién es** (Rector / Coordinador / Docente) → **Beneficios** → **Integraciones** → **Seguridad y privacidad** → **Prueba social** → **Planes** → **FAQ** → **CTA final** → **Footer**.
- Navbar sticky con logo a la izquierda y dos botones a la derecha: **Login** y **Solicitar demo**. El botón Login cambia a **"Ir al Dashboard"** cuando el usuario está autenticado.
- Botón **Solicitar demo** abre un formulario (Dialog/Sheet de shadcn) para capturar interés institucional. No existe auto-registro: las cuentas se crean por invitación (rector → docentes, superadmin → rector).
- Contenido de relleno coherente con el dominio educativo, **centralizado en archivos de constantes** (un archivo por sección) para facilitar edición posterior y futura i18n.
- Idioma único en v1: **español**. Copy estructurado como constantes para que migrar a multi-idioma sea barato (sin hardcodear strings en JSX).
- Contrato `useAuthStatus()` provisto por la landing — en v1 retorna siempre `unauthenticated`. Cuando exista la spec de autenticación, ese hook se conecta sin tocar la landing.
- Performance budget explícito: **LCP < 2.5s en 4G**, imagen del hero con `next/image` (AVIF/WebP, blur placeholder).
- En navegación móvil, los CTAs (Login y Solicitar demo) son visibles siempre; el resto del menú (si aplica) entra en hamburguesa.
- Logos, ilustraciones del hero, imágenes de prueba social y cualquier asset gráfico **se solicitan al usuario durante la fase de implementación** (no se incluyen en la spec).

## Capabilities

### New Capabilities

- `landing-page`: Página pública `/` con navbar sticky, hero, secciones de marketing (dolores, cómo funciona, características, audiencias, beneficios, integraciones, seguridad, prueba social, planes, FAQ, CTA, footer), formulario de solicitud de demo, y botón de acceso que reacciona al estado de autenticación.
- `ui-foundation`: Configuración manual de shadcn/ui sobre Tailwind v4, tokens de tema importables desde un constructor externo, y convenciones de uso (shadcn-first, prohibición de duplicar primitivas).
- `auth-status-contract`: Hook cliente `useAuthStatus()` que expone `{ status: 'authenticated' | 'unauthenticated' | 'loading', dashboardHref?: string }`. En v1 retorna `unauthenticated` constante; futura spec de auth lo implementa sin cambiar consumidores.

### Modified Capabilities

<!-- Ninguna — es la primera spec del proyecto. -->

## Impact

- **Código nuevo**:
  - `next-app/app/page.tsx` (landing — RSC)
  - `next-app/app/layout.tsx` (metadata, fuente, theme provider si aplica)
  - `next-app/components/ui/*` (primitivas shadcn instaladas manualmente)
  - `next-app/components/landing/*` (composiciones de sección, RSC salvo botones/form)
  - `next-app/components/landing/auth-cta.tsx` (client component que usa `useAuthStatus`)
  - `next-app/components/landing/request-demo-form.tsx` (client component)
  - `next-app/lib/auth/use-auth-status.ts` (contrato + stub de v1)
  - `next-app/content/landing/*.ts` (constantes por sección)
  - `next-app/lib/cn.ts`, `next-app/styles/globals.css` (utilidades shadcn, tokens de tema)
- **Dependencias añadidas**: `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `@radix-ui/*` (los que requieran los componentes shadcn elegidos), `react-hook-form` + `zod` + `@hookform/resolvers` para el formulario.
- **Configuración**: `tsconfig.json` (alias `@/*`), `components.json` (config de shadcn manual), `postcss.config.mjs` (ya existe — confirmar tokens Tailwind v4), variables CSS de tema en `globals.css`.
- **Sin backend todavía**: el envío del formulario "Solicitar demo" en v1 es un endpoint stub (`POST /api/demo-request`) que valida y responde 200 sin persistir; la integración real se define en spec futura.
- **Assets pendientes** (se solicitan en implementación): logo Docentix (SVG light/dark), imagen del hero, avatares/logos de instituciones para prueba social, iconografía complementaria.
- **Sin impacto en sistemas existentes**: proyecto limpio, no hay migraciones ni rutas previas.
