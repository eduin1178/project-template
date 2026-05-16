## Context

Este change agrupa tres frentes de pulido visual e infraestructura de comunicación que comparten una motivación común (reducir fricción visual en superficies clave) pero tocan capas distintas del stack:

1. **UI de tareas**: el `TasksRouteShell` actual ([next-app/components/tasks/tasks-route-shell.tsx](next-app/components/tasks/tasks-route-shell.tsx)) renderiza un `aside` permanente en desktop con clases `hidden md:block`, y un `MobileFiltersTrigger` con `md:hidden`. La capability `tasks-core` ya describe este comportamiento dual en su requirement "Panel de filtros responsivo".

2. **UI de auth**: cinco páginas en `next-app/app/(auth)/` repiten el patrón `<div center><Card><CardHeader/><CardContent/></Card></div>` sin marca visible. El botón de Google es solo texto.

3. **Emails**: `next-app/lib/auth/emails.ts` envía texto plano y, como fallback HTML, `<pre>{escapeHtml(text)}</pre>`. No hay layout, branding ni personalización por invitador. Resend ya está integrado y soporta nativamente componentes React vía `resend.emails.send({ react })`.

Stakeholders: usuarios finales (admins y members), super_admins (creadores de orgs), y el equipo de producto que quiere onboarding más confiable.

## Goals / Non-Goals

**Goals:**
- Recuperar espacio horizontal en la bandeja de tareas en desktop unificando la UX de filtros en un único `Sheet`.
- Establecer identidad visual consistente (logo Docentix) en todas las páginas de autenticación.
- Cumplir Google Brand Guidelines en el botón OAuth (logo oficial multicolor).
- Adoptar React Email como sistema de plantillas para emails transaccionales, con `EmailLayout` reutilizable.
- Rediseñar los dos correos de invitación con copy diferenciado: Super→Admin como bienvenida con features y primeros pasos, Admin→Member como invitación con confianza (mencionando invitador).
- Mantener fallback `text` plano en todos los emails (deliverability + accesibilidad).

**Non-Goals:**
- No tocar la lógica de generación/aceptación de invitaciones (tokens, validaciones, transacciones). Solo cambia el contenido y el contrato de los helpers de envío.
- No introducir un sistema de templates parametrizable desde admin UI. Los templates son código.
- No rediseñar el dashboard, las páginas de organización, ni otros componentes fuera del scope listado.
- No internacionalización: el copy sigue siendo español neutral.
- No migrar a otro proveedor de email — Resend se mantiene.
- No tocar las dimensiones de columnas de la bandeja de tareas más allá de eliminar el aside.

## Decisions

### D1. Filtros: un solo `Sheet` para todos los viewports

**Decisión**: eliminar el `aside` fijo y exponer el botón "Filtros" en todos los viewports, abriendo el mismo `Sheet` ya existente.

**Alternativas consideradas**:
- *`Popover` en desktop + `Sheet` en mobile*: dos comportamientos, más código condicional y dos UX que mantener. Rechazada por complejidad sin ganancia clara.
- *Mantener `aside` colapsable*: complica accesibilidad y persistencia de estado; no resuelve la queja de espacio.

**Implementación clave**:
- Renombrar `MobileFiltersTrigger` → `FiltersTrigger` (export y consumidor en `tasks-route-shell.tsx`).
- Remover el bloque `<aside className="hidden md:block">...</aside>` del shell.
- Mover el wrapper `<div className="md:hidden">` envolviendo el trigger y dejarlo siempre visible.
- El `Sheet` mantiene `side="left"` para consistencia con la metáfora mental "el panel sale del costado".

### D2. Layout compartido de auth con logo externo a la card

**Decisión**: crear `components/auth/auth-card-layout.tsx` que renderiza `<Logo /> + <Card>{children}</Card>` con el wrapper de centrado. Las 5 páginas pasan a usar este layout.

**Alternativas consideradas**:
- *Modificar cada page individualmente*: duplicación inmediata y deriva visual posterior.
- *Modificar `(auth)/layout.tsx`* directamente: ata el logo al group route; menos flexible si una página futura quiere variantes.

**Implementación clave**:
- `AuthCardLayout` recibe `children: React.ReactNode` y opcionalmente `className`.
- El logo se renderiza con `next/image` usando `priority` (LCP-relevante).
- Para soporte de tema claro/oscuro, dos enfoques posibles:
  - **Elegido**: doble `<Image>` con clases `block dark:hidden` y `hidden dark:block`. Simple, sin JS, sin flicker.
  - Descartado: un solo `<Image>` con `src` controlado por `useTheme()` (requiere mount + provoca flicker durante hidratación).
- Tamaño: `height={48}` con `width` proporcional según el aspect ratio del PNG.

### D3. Logo de Google: SVG oficial multicolor como asset

**Decisión**: descargar el SVG oficial de Google (versión "g" multicolor, no monocromo) y servirlo desde `public/images/google-logo.svg`. Renderizarlo con `next/image`.

**Alternativas consideradas**:
- *Phosphor `GoogleLogoIcon`*: monocromo. Viola brand guidelines de Google y reduce reconocimiento.
- *SVG inline en JSX*: pollute del componente. Aceptable, pero un asset es más limpio y cacheable.
- *Imagen PNG*: el SVG es vectorial y más liviano; no hay razón para usar PNG.

**Implementación clave**:
- Fuente: SVG oficial publicado por Google (developers.google.com/identity/branding-guidelines). Mantener el color exacto.
- Render: `<Image src="/images/google-logo.svg" width={18} height={18} alt="" />` (alt vacío porque el botón ya tiene texto "Continuar con Google").

### D4. React Email + Resend para templates

**Decisión**: adoptar `@react-email/components` para construir templates. Mantener Resend como proveedor de envío (ya en uso). Cada template es un componente React server-only.

**Alternativas consideradas**:
- *MJML*: requiere build step extra y un compilador. React Email es JSX puro.
- *HTML inline a mano con tablas*: extremadamente frágil entre clientes de email; cero ergonomía.
- *Plantillas Handlebars o similares*: añade un motor de templating ajeno al stack React/Next.

**Implementación clave**:
- Dependencia runtime: `@react-email/components`. Dev: `react-email` (para `npx react-email dev` y preview local).
- Estructura:
  ```
  next-app/lib/email/
  ├── templates/
  │   ├── email-layout.tsx          ← Layout compartido (Html, Head, Body, Container, header, footer)
  │   ├── org-admin-welcome-email.tsx ← Super → Admin
  │   └── tenant-invitation-email.tsx ← Admin → Member
  └── (la API de envío sigue en lib/auth/emails.ts; importa los templates)
  ```
- Cada template exporta:
  - El componente React `<TemplateName props />` para Resend.
  - Una función `renderText(props): string` que devuelve la versión texto plano equivalente (single source of truth de contenido).
- `sendEmail()` en `lib/auth/emails.ts` se reescribe para aceptar `{ to, subject, react, text }`. Si `RESEND_API_KEY` no está definida, se loguea como antes.

### D5. Logo de email servido como URL pública

**Decisión**: el header del `EmailLayout` referencia `${BETTER_AUTH_URL}/images/logo-horizontal.png` (variante clara). Sin variante dark — clientes de email no soportan `prefers-color-scheme` de manera fiable.

**Alternativas consideradas**:
- *Base64 inline*: aumenta peso del email, algunos clientes (Gmail clipping) cortan emails grandes.
- *CID (attachment con Content-ID)*: Resend lo soporta pero añade complejidad; el render falla en algunos webmails.
- *URL pública* (elegida): simple, cacheable. Algunos clientes bloquean imágenes hasta que el usuario lo permite; el fallback es el `alt` text con "Docentix".

**Implementación clave**:
- Constante centralizada en `email-layout.tsx`: `const LOGO_URL = \`\${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/images/logo-horizontal.png\``.
- `alt="Docentix"`, `width={160}` aproximado, `height` proporcional.

### D6. Cambio de firma `sendTenantInvitationEmail` con `inviterName`

**Decisión**: agregar parámetro obligatorio `inviterName: string` a `sendTenantInvitationEmail`. Propagarlo desde call sites pasando `session.user.name`.

**Alternativas consideradas**:
- *Opcional con fallback a "Un administrador"*: degrada la confianza del email cuando falta dato. Mejor exigirlo.
- *Pasar el objeto `inviter` completo*: innecesario, solo se usa el nombre. YAGNI.

**Implementación clave**:
- Firma nueva: `sendTenantInvitationEmail({ to, organizationName, role, invitationId, ttlDays, inviterName })`.
- En `app/account/organizations/[id]/actions.ts` (dos call sites, líneas ~246 y ~299), obtener `inviterName` de la session que ya se recupera vía `requireSession`.
- Si por algún motivo `session.user.name` viene vacío, usar `session.user.email` como fallback (decisión defensiva, NO documentar como contrato — solo defensa).

### D7. Estructura del correo Super→Admin (bienvenida)

**Contenido fijo** (todas las features destacadas, prioridad declarada en invitaciones):

```
[Logo Docentix]

¡Bienvenido a Docentix!

Has sido invitado a administrar la organización "{organizationName}".
Docentix es una plataforma diseñada para coordinar tareas, equipos y documentación.

Con Docentix podrás:
• Gestionar tu organización y configurarla a la medida de tu equipo
• Invitar miembros y asignar roles
• Crear tareas con checklists, fechas y prioridades
• Coordinar a tu equipo mediante comentarios y adjuntos
• Mantener un historial claro de avances

Primeros pasos:
1. Acepta la invitación con el botón de abajo
2. Completa tu perfil
3. Invita a tu equipo

[Aceptar invitación] (CTA prominente)

El enlace expira en {ttlDays} {días}.

Si no esperabas esta invitación, ignora este mensaje.
```

### D8. Estructura del correo Admin→Member (invitación de confianza)

```
[Logo Docentix]

Hola,

{inviterName} te ha invitado a unirte a "{organizationName}" en Docentix como {roleLabel}.

Docentix es la plataforma donde tu equipo organiza tareas, comparte documentos
y coordina su trabajo día a día. Acepta la invitación para empezar a colaborar.

[Aceptar invitación] (CTA prominente)

El enlace expira en {ttlDays} {días}.

Si no conoces a {inviterName} o no esperabas esta invitación, ignora este mensaje.
```

### D9. Empaquetado en un solo change pero tasks agrupados

**Decisión**: un proposal único con `tasks.md` agrupado en tres secciones claramente separables (Bloque A: Filtros, Bloque B: Auth UI, Bloque C: Emails). Esto permite que la fase `apply` slice los PRs si el `delivery_strategy` lo requiere.

**Justificación**: el usuario solicitó explícitamente un solo proposal. Sin embargo, los tres bloques son independientes en superficie y en pruebas, por lo que el `tasks.md` los mantiene agrupados para revisión clara y eventual chained-PR.

## Risks / Trade-offs

- **[Riesgo]** `@react-email/components` accidentalmente bundleado en cliente → bundle bloat → **Mitigación**: templates viven en `lib/email/templates/` (server-only por convención del proyecto), importados solo desde `lib/auth/emails.ts` (que tiene `import "server-only"`). Verificar con análisis de bundle si surgen dudas.

- **[Riesgo]** Logo en emails bloqueado por cliente (Gmail "Display images below") → emails sin marca visible → **Mitigación**: `alt="Docentix"` siempre presente; el copy del email NO depende del logo para ser legible.

- **[Riesgo]** Cambio de firma de `sendTenantInvitationEmail` rompe call sites no listados → **Mitigación**: `grep` exhaustivo de la función antes de aplicar; TypeScript bloquea el build si falta un parámetro obligatorio.

- **[Riesgo]** El SVG oficial de Google está sujeto a brand guidelines (no alterar colores, no agregar efectos) → **Mitigación**: descargar de fuente oficial, no modificar el SVG, usar `next/image` sin filtros CSS.

- **[Riesgo]** Renombrar `MobileFiltersTrigger` → `FiltersTrigger` rompe imports → **Mitigación**: único consumidor es `tasks-route-shell.tsx`; rename atómico junto con el cambio de comportamiento.

- **[Riesgo]** El cambio del shell de tareas modifica un contrato ya documentado en `tasks-core` (requirement "Panel de filtros responsivo") → **Mitigación**: delta `MODIFIED` explícito en `specs/tasks-core/spec.md` que reescribe el requirement y sus escenarios.

- **[Trade-off]** No soportar dark mode en el header del email simplifica entrega pero deja una inconsistencia visual menor para usuarios con clientes con tema oscuro → aceptado, costo/beneficio favorece simplicidad.

- **[Trade-off]** Un solo `Sheet` para ambos viewports puede sentirse pesado en desktop comparado con un Popover anclado → aceptado, costo/beneficio favorece simplicidad y consistencia con UX que ya existe en mobile.

## Migration Plan

No hay migración de datos. El despliegue es directo:

1. `npm i @react-email/components` y `npm i -D react-email` dentro de `next-app/`.
2. Descargar `google-logo.svg` y colocarlo en `next-app/public/images/`.
3. Implementar los templates y refactorizar `emails.ts`.
4. Implementar el `AuthCardLayout` y actualizar las 5 páginas de auth.
5. Implementar el `FiltersTrigger` renombrado y actualizar `tasks-route-shell.tsx`.
6. Actualizar specs deltas.

**Rollback**: revertir el commit/PR. No hay efectos persistentes (DB, archivos generados, externos a invalidar).

**Verificación post-deploy**:
- Smoke test manual de las 5 páginas de auth en claro y oscuro.
- Disparar una invitación Super→Admin y una Admin→Member en staging y abrir el email en Gmail web + iOS Mail.
- Abrir `/admin/tasks` en desktop y verificar que el botón Filtros funciona y el aside ya no aparece.
