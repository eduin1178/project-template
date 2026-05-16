# Design — slug-scoped-workspace-routes

## Decisión 1: ¿Fundir `/admin` y `/app` en `/<slug>`, o mantener separados como `/<slug>` y `/<slug>/admin`?

**Opciones**:

| Opción | URL del dashboard member | URL del dashboard admin | Pros | Contras |
|--------|---------------------------|--------------------------|------|---------|
| A. Fusión total | `/<slug>` (server decide qué se renderiza por rol-en-org) | (no existe — todo es `/<slug>`) | URL única, simple | Mezcla dos vistas distintas en la misma ruta. El admin no puede bookmarkear "el panel admin" como diferente del "panel member" |
| B. Separados explícitos | `/<slug>` (member-view dashboard) | `/<slug>/admin` (admin-view dashboard) | URLs bookmarkeables. Admin puede compartir "/<slug>/admin/tasks" sabiendo qué muestra | Dos páginas a mantener (mismo orden de magnitud que hoy) |
| C. Roles separados via query | `/<slug>?view=member` vs `?view=admin` | igual | URL única | Query strings para algo que es estructural — anti-patrón |

**Elegida**: **B — separados explícitos**.

**Por qué**:
- Es el patrón Vercel (`/<team>/dashboard` vs `/<team>/settings`).
- Permite que un admin pase un link `/<slug>/admin/tasks/123` a otro admin sin ambigüedad.
- Mantiene la diferencia conceptual entre "lo que hago como participante" (`/<slug>`) y "lo que hago como administrador" (`/<slug>/admin`).
- Si un member intenta abrir `/<slug>/admin`, el sublayout admin lo manda a `/<slug>` — comportamiento esperable.

**Consecuencias**:
- Dos páginas dashboard (`/<slug>/page.tsx` y `/<slug>/admin/page.tsx`), que es el mismo costo de mantenimiento que hoy.
- La sección admin es identificable por URL y por menú.

## Decisión 2: ¿Slug en la URL o subdominio (`<slug>.docentix.com`)?

**Opciones**: path (`/<slug>/...`) vs subdomain (`<slug>.docentix.com/...`).

**Elegida**: **path**.

**Por qué**:
- Subdominio requiere wildcard DNS + reconfiguración SSL + impacto en cookies (cross-subdomain).
- Path es lo que hace Linear, Notion, Vercel-projects, GitHub-orgs.
- Si Docentix algún día necesita subdominios (white-label, branding), pasa a ser un change separado. No bloqueamos ese futuro.

**Consecuencias**:
- Cookies funcionan sin tocar `cookieDomain`.
- Posible colisión entre slugs y rutas reservadas (mitigado por allowlist).

## Decisión 3: ¿Cómo manejar slugs reservados?

Sin protección, alguien podría crear una org con slug `"super"`, `"account"`, `"api"`, etc. y romper el routing.

**Solución**: lista hardcoded en `next-app/lib/auth/reserved-slugs.ts`:

```ts
export const RESERVED_SLUGS = new Set([
  "super", "account", "api", "login", "signup",
  "forgot-password", "reset-password", "verify-email",
  "check-email", "accept-invitation", "post-login",
  "_next", "favicon.ico", "robots.txt", "sitemap.xml",
  // Reserva forward-looking:
  "admin", "app", "settings", "billing", "docs", "help",
  "status", "blog", "about", "legal", "privacy", "terms",
]);
```

La validación corre en:
- Creación de org desde `/super/organizations/new`.
- Validación previa del setup de la org plataforma (`docentix` no está reservado a propósito; ES la org plataforma).

Re-validación en runtime: `app/[slug]/layout.tsx` ejecuta `getFullOrganization` que naturalmente NO va a encontrar org con esos slugs, y `notFound()` se dispara.

## Decisión 4: ¿Slug inmutable o renombrable con aliases?

**Opciones**:

- A. Slug inmutable. Si cambia el nombre, slug se mantiene.
- B. Slug editable. Mantener tabla `organization_slug_aliases` con los slugs viejos y `permanentRedirect` desde proxy.

**Elegida**: **A — slug inmutable** para este change.

**Por qué**:
- Es lo que hace Vercel para team slugs (sí permite rename, pero con costo: invalida links, requiere comunicación).
- Tabla de aliases agrega complejidad que no es urgente.
- Si en el futuro se necesita, es un change aparte que agrega tabla, action de rename, proxy redirects.

**Consecuencias**:
- UI de edición de org NO muestra campo slug (o lo muestra read-only).
- Equipo de Docentix acepta que el slug es para siempre. Si una institución necesita renombrarse drásticamente, se crea una org nueva.

## Decisión 5: ¿Cómo sincronizar `activeOrganizationId` con el slug de la URL?

La sesión guarda `activeOrganizationId`. La URL guarda `slug`. Si difieren, ¿quién gana?

**Decisión**: **el slug de la URL gana**. La sesión es solo cache para defaults.

Algoritmo en `app/[slug]/layout.tsx`:

1. Resolver org por slug (validación de existencia + membresía).
2. Si `session.activeOrganizationId !== org.id`:
   - `setActiveOrganization({ organizationSlug: slug })` (sync silencioso).
   - Actualizar `user.lastActiveOrganizationId = org.id` en DB.
3. Renderizar el shell.

**Implicaciones**:
- Cualquier mutación que dependa de `session.activeOrganizationId` en el server (ej. server actions) DEBE asumir que ese valor es consistente con la URL del request. Como las server actions corren en el contexto de un layout que YA validó el slug, esto es seguro.
- Multi-tab: tab A en `/<slugX>`, tab B en `/<slugY>`. Cada tab actualiza la sesión al abrirse. La sesión va a flipear según qué tab fue activa últimamente. PERO: cada tab opera sobre `params.slug`, no sobre `session.activeOrganizationId` directamente (excepto server actions, que en este modelo deberían recibir explícitamente `orgId` derivado del slug).

**Decisión follow-on**: las server actions del workspace SHALL recibir `organizationId` o `organizationSlug` como argumento explícito, NO depender de `session.activeOrganizationId`. Esto se documenta como convención en `next-app/AGENTS.md` y se aplica gradualmente. Los call sites del UI ya tienen el slug en `params`; pasárselo al action es trivial.

> **Nota de scope**: este change NO migra todas las server actions a recibir slug explícito. Solo documenta la convención y migra las críticas (las que el flujo del shell unificado toca). El resto puede mantenerse usando `session.activeOrganizationId` (con el riesgo de inconsistencia multi-tab) y migrarse en un follow-up.

## Decisión 6: ¿`AppShell` como componente client o como server component?

**Decisión**: **server component**.

**Por qué**:
- Los layouts que lo consumen ya hacen `await headers()`, `await auth.api.getSession`, queries de Drizzle — todo server-side.
- `AppShell` solo orquesta render. Sus hijos (sidebar, header, toaster) tienen sus propias islas client donde corresponde.
- Permite que `AppShell` reciba `session`, `memberships`, `activeOrgs` ya resueltos como props sin pagar el costo de serialización + re-fetch.

**Implementación**:

```tsx
// components/layout/app-shell.tsx (server component)
import "server-only";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AppSidebar } from "@/components/layout/app-sidebar";

type Props = {
  sidebarConfig: SidebarConfig;
  user: { name: string; email: string; image: string | null };
  role: MenuRole;
  teams?: TeamSwitcherProps;
  headerLabel: string;
  children: ReactNode;
};

export function AppShell({ sidebarConfig, user, role, teams, headerLabel, children }: Props) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar config={sidebarConfig} user={user} role={role} teams={teams} />
        <SidebarInset>
          <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-16" />
            <span className="text-sm font-medium">{headerLabel}</span>
            <div className="ml-auto flex items-center">
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 px-6 py-8">{children}</main>
        </SidebarInset>
        <Toaster />
      </SidebarProvider>
    </TooltipProvider>
  );
}
```

## Decisión 7: ¿Cómo manejar el item "Panel de plataforma" en sidebars cuando se introduce slug?

El change 2 agregó "Panel de plataforma" como item del sidebar del workspace, con `href="/super"`. Eso sigue funcionando en el modelo slug — `/super` es ruta global.

El sidebar del `/super` (configurado en `contexts/super.ts`) tiene "Volver a mi institución" con `href="/post-login"`. En el modelo slug, mejorarlo: si la sesión tiene `activeOrganizationId`, resolver el slug y poner `href="/<slug>"`. Esto es trabajo del server al construir el sidebar config, no del client.

## Decisión 8: ¿Mantener route group `(app)` con paréntesis para algo, o eliminarlo?

`(app)` agrupa rutas que comparten el shell pero no agrega segmento URL. Como ahora todas las rutas del workspace viven bajo `[slug]/`, el route group `(app)` ya no aporta nada. Se elimina.

## Decisión 9: ¿Cómo migrar el código existente sin romper hrefs?

**Estrategia**:

1. Crear `/[slug]/*` con código duplicado de `/(app)/*` y `/admin/*`. Validar que funciona.
2. Refactorizar `/(app)/*` y `/admin/*` para que solo redirijan a `/<lastSlug>/*` (versión transitoria).
3. Una vez confirmado, eliminar `/(app)/*` y `/admin/*` por completo. Los redirects pasan a `proxy.ts`.
4. Buscar hrefs viejos con grep y reemplazarlos por hrefs nuevos con slug.

Alternativa "big bang" (borrar todo y crear de cero): más rápida pero deja la PR sin instrumento de validación intermedia. Dado el blast radius, **prefiero la estrategia graduada** (paso 1-4) para permitir verificación visual entre pasos.

## Invariantes establecidos al cierre

- **INV-1**: Toda URL de workspace tiene forma `/<slug>/...` donde `<slug>` corresponde a una `organization.slug` existente y a la que el usuario es miembro activo.
- **INV-2**: `app/[slug]/layout.tsx` es la única autoridad de validación de membresía para el workspace.
- **INV-3**: El componente `AppShell` es el único shell de rutas autenticadas con sidebar. Los layouts (`app/[slug]/layout.tsx`, `app/super/(protected)/layout.tsx`) solo orquestan datos y delegan render.
- **INV-4**: El switch de org es navegación (`router.push`), no mutación de sesión. La sesión es cache.
- **INV-5**: Slug es inmutable. Cualquier intento de cambiarlo requiere un change nuevo con tabla de aliases.
