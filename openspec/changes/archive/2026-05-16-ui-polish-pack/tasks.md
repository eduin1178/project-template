# Tasks — ui-polish-pack

El trabajo se agrupa en **tres bloques independientes** (A: Filtros, B: Auth UI, C: Emails). Cada bloque es entregable por separado y puede convertirse en un PR encadenado si la política de tamaño lo requiere. El Bloque 0 contiene preparación común.

## 0. Preparación

- [x] 0.1 Verificar que `next-app/public/images/logo-horizontal.png` y `logo-horizontal-dark.png` existen y son adecuados para uso público (sí, ya están en el repo)
- [x] 0.2 Descargar el SVG oficial multicolor de Google ("G" logo, brand guidelines de Google Identity) y guardarlo en `next-app/public/images/google-logo.svg` sin modificar colores ni proporciones
- [x] 0.3 Confirmar que `BETTER_AUTH_URL` está configurada en `.env*` para entornos donde se enviarán emails (necesaria para el logo público y el CTA de aceptación)

---

## Bloque A — Unificación de filtros de tareas

## A1. Renombrar y exponer el trigger de filtros

- [x] A1.1 En `next-app/components/tasks/tasks-shell.tsx`, renombrar `MobileFiltersTrigger` → `FiltersTrigger` (y el subcomponente interno `MobileFiltersSheet` → `FiltersSheet`)
- [x] A1.2 Mantener `side="left"` y todo el comportamiento existente del `Sheet` (key por pathname, badge con `activeCount`, etc.)
- [x] A1.3 Verificar que el copy del aria-label y del badge sigue en español neutral

## A2. Quitar el aside y conectar el nuevo trigger

- [x] A2.1 En `next-app/components/tasks/tasks-route-shell.tsx`, eliminar el bloque `<aside className="bg-muted/30 hidden w-64 shrink-0 overflow-y-auto border-r p-4 md:block">{filtersPanel}</aside>`
- [x] A2.2 Reemplazar el wrapper `<div className="md:hidden">` que envuelve al trigger por uno sin clases de viewport (visible siempre); actualizar el import a `FiltersTrigger`
- [x] A2.3 Ajustar las clases del flex container si fuese necesario para que la nueva distribución (sin aside) respire bien en desktop sin alterar dimensiones de columnas existentes
- [x] A2.4 Buscar otros consumidores con `Grep` por `MobileFiltersTrigger` y `MobileFiltersSheet` y actualizar imports

## A3. Verificación visual del Bloque A

- [x] A3.1 Abrir `/admin/tasks` en desktop, tablet y mobile (ancho de viewport simulado) y verificar: botón "Filtros" visible en todos, no hay aside, Sheet abre y aplica filtros, badge con conteo se actualiza
- [x] A3.2 Abrir `/tasks` (member) y repetir verificación

---

## Bloque B — Mejora visual de páginas de autenticación

## B1. Componente compartido `AuthCardLayout`

- [x] B1.1 Crear `next-app/components/auth/auth-card-layout.tsx` que exporte `AuthCardLayout({ children, className? })`
- [x] B1.2 Implementar el wrapper de centrado (`bg-background flex min-h-screen items-center justify-center px-4`) y el contenedor flex-col que apila logo + card con `gap-6` o `mb-6` entre ambos
- [x] B1.3 Renderizar dos `<Image>` para el logo: uno con clases `block dark:hidden` apuntando a `/images/logo-horizontal.png`, otro con `hidden dark:block` apuntando a `/images/logo-horizontal-dark.png`. Ambos con `priority`, `alt="Docentix"`, `height={48}`, `width` proporcional
- [x] B1.4 Renderizar `<Card className="w-full max-w-md">{children}</Card>` dentro del layout (la card es responsabilidad del layout; las pages aportan solo el contenido)

## B2. Botón "Continuar con Google" con logo oficial

- [x] B2.1 En `next-app/app/(auth)/login/login-form.tsx`, importar `Image` de `next/image`
- [x] B2.2 Modificar el botón "Continuar con Google" para incluir `<Image src="/images/google-logo.svg" width={18} height={18} alt="" />` antes del texto, con `gap-2` o equivalente para separación
- [x] B2.3 Verificar que no se importa ni renderiza ningún ícono monocromo (Phosphor) en este botón

## B3. Adaptar las 5 páginas de auth al layout compartido

- [x] B3.1 `next-app/app/(auth)/login/page.tsx` → reemplazar el wrapper actual `<div ...><Card ...>{...}</Card></div>` por `<AuthCardLayout><CardHeader/><CardContent/>{...}</AuthCardLayout>`
- [x] B3.2 `next-app/app/(auth)/forgot-password/page.tsx` → mismo refactor
- [x] B3.3 `next-app/app/(auth)/reset-password/page.tsx` → mismo refactor
- [x] B3.4 `next-app/app/(auth)/verify-email/page.tsx` → mismo refactor
- [x] B3.5 `next-app/app/(auth)/check-email/page.tsx` → mismo refactor

## B4. Verificación visual del Bloque B

- [x] B4.1 Abrir las 5 páginas en tema claro y oscuro; confirmar logo visible y variante correcta por tema
- [x] B4.2 Inspeccionar la cascada de hidratación para verificar que NO hay flicker en el switch de logo (cambio puro por CSS)
- [x] B4.3 Confirmar en `/login` que el botón de Google muestra el logo multicolor a la izquierda del texto

---

## Bloque C — Sistema de emails con React Email

## C1. Instalación de dependencias

- [x] C1.1 En `next-app/`, ejecutar `npm i @react-email/components`
- [x] C1.2 En `next-app/`, ejecutar `npm i -D react-email`
- [x] C1.3 Confirmar que `@react-email/components` queda en `dependencies` y `react-email` en `devDependencies` de `next-app/package.json`

## C2. `EmailLayout` compartido

- [x] C2.1 Crear directorio `next-app/lib/email/templates/`
- [x] C2.2 Crear `next-app/lib/email/templates/email-layout.tsx` con `import "server-only"` y export `EmailLayout({ preview, children })`
- [x] C2.3 Implementar estructura con primitivas de `@react-email/components`: `Html`, `Head`, `Preview`, `Body`, `Container`, `Section`, `Img`, `Text`, `Hr`, `Link`
- [x] C2.4 Header: `<Img src={\`\${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/images/logo-horizontal.png\`} alt="Docentix" width={160} />`
- [x] C2.5 Footer minimalista en español neutral: "Este es un mensaje automático de Docentix." + link al producto
- [x] C2.6 Estilos inline minimalistas (paleta consistente con la app: foreground/background neutrales, primary para CTA)

## C3. Plantilla `OrgAdminWelcomeEmail` (Super → Admin)

- [x] C3.1 Crear `next-app/lib/email/templates/org-admin-welcome-email.tsx` con `import "server-only"`
- [x] C3.2 Definir props: `{ organizationName, invitationId, ttlDays, acceptUrl }`
- [x] C3.3 Componer el cuerpo según D7 del design: bienvenida → mención de organización → resumen de capacidades → tres primeros pasos numerados → CTA "Aceptar invitación" (botón estilizado) → TTL → disclaimer
- [x] C3.4 Usar `<Button>` de React Email para el CTA, con `href={acceptUrl}`
- [x] C3.5 Copy en español neutral (Acepta / Completa / Invita / Ignora)
- [x] C3.6 Exportar también `renderOrgAdminWelcomeEmailText(props): string` que devuelve la versión texto plano equivalente con los mismos contenidos

## C4. Plantilla `TenantInvitationEmail` (Admin → Member)

- [x] C4.1 Crear `next-app/lib/email/templates/tenant-invitation-email.tsx` con `import "server-only"`
- [x] C4.2 Definir props: `{ inviterName, organizationName, role, invitationId, ttlDays, acceptUrl }`
- [x] C4.3 Componer el cuerpo según D8 del design: saludo → frase con `{inviterName}` + `{organizationName}` → breve instrucción → CTA → TTL → disclaimer mencionando al invitador
- [x] C4.4 Calcular `roleLabel` ("administrador" si `role === "admin" || role === "owner"`, sino "miembro") y usarlo en el copy
- [x] C4.5 Copy en español neutral
- [x] C4.6 Exportar también `renderTenantInvitationEmailText(props): string` con el equivalente texto

## C5. Refactor de `lib/auth/emails.ts`

- [x] C5.1 Importar los nuevos templates y sus funciones `render*Text`
- [x] C5.2 Refactorizar `sendEmail` para aceptar opcionalmente `react?: React.ReactElement` además de `text`; cuando se pasa `react`, invocar `resend.emails.send({ from, to, subject, react, text })` (omitir el campo `html` con `<pre>`)
- [x] C5.3 Mantener el branch de `RESEND_API_KEY` no definida (log a consola con `text`) sin cambios funcionales
- [x] C5.4 Refactorizar `sendOrgAdminInvitationEmail` para construir `acceptUrl`, llamar a `sendEmail` con `react: <OrgAdminWelcomeEmail/>` y `text: renderOrgAdminWelcomeEmailText(...)`. Asunto: mantener "Invitación para administrar {organizationName} en Docentix" (o ajustar a tono de bienvenida si conviene)
- [x] C5.5 Refactorizar `sendTenantInvitationEmail` para:
  - Agregar parámetro obligatorio `inviterName: string`
  - Construir `acceptUrl`
  - Llamar a `sendEmail` con `react: <TenantInvitationEmail/>` y `text: renderTenantInvitationEmailText(...)`
- [x] C5.6 Eliminar la función `escapeHtml` y el fallback `html: <pre>${escapeHtml(text)}</pre>` (queda obsoleto)

## C6. Propagar `inviterName` desde los call sites

- [x] C6.1 En `next-app/app/account/organizations/[id]/actions.ts` línea ~246, obtener `inviterName` de la session (`session.user.name`, fallback defensivo a `session.user.email`) y pasarlo a `sendTenantInvitationEmail`
- [x] C6.2 En el segundo call site (línea ~299, reenvío), repetir lo mismo
- [x] C6.3 Verificar que TypeScript no reporta errores por parámetros faltantes (compile check mental, sin ejecutar build)
- [x] C6.4 `Grep` adicional por `sendTenantInvitationEmail` para confirmar que no quedan call sites sin actualizar

## C7. Verificación funcional del Bloque C

- [x] C7.1 Con `RESEND_API_KEY` no definida, disparar una invitación Super → Admin y comprobar que el log a consola incluye el texto plano completo (saludo, organización, primeros pasos, CTA URL, TTL)
- [x] C7.2 Repetir con una invitación Admin → Member y verificar que el log incluye nombre del invitador, organización y CTA URL
- [x] C7.3 (Opcional, si hay key de staging) Enviar ambos correos a un buzón real y abrir en Gmail web e iOS Mail; verificar logo, CTA y legibilidad
- [x] C7.4 Ejecutar `npx react-email dev` localmente para preview de los templates y validar layout

---

## Cierre

- [ ] Z1 Confirmar que los tres bloques pueden mergearse independientemente (sin imports cruzados accidentales)
- [ ] Z2 Si el tamaño total del diff supera 400 líneas, coordinar con el delivery strategy del repo: chained PRs (uno por bloque) o `size:exception` documentado
