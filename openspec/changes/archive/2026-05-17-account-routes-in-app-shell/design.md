## Context

`/account/*` (perfil, mis instituciones, mis invitaciones) son rutas **user-scoped**: dependen del usuario, no de una organización. Hoy viven en un layout minimal (`app/account/layout.tsx`) con header propio y un link "Volver al panel" calculado por `deriveDashboardHref`. El resto de la app autenticada (workspace member, workspace admin, panel super) usa `AppShell` (sidebar + topbar + team switcher).

La asimetría tiene dos consecuencias:

1. UX: ir al perfil "saca" al usuario del shell. Pierde sidebar, switcher de instituciones y el menú del avatar.
2. Edge sin org: si un usuario sin orgs activas termina en `/[slug]/*` (link viejo, bookmark, redirect mal calculado), el layout responde `notFound()`. La 404 no comunica nada útil.

La navegación a las rutas de cuenta YA existe en el dropdown del avatar (`NavUser` en `components/layout/nav-user.tsx`). No hay que duplicarla en el sidebar.

`AppShell` exige hoy `sidebarConfig`, `user`, `role`, `teams?`, `headerLabel`. `TeamSwitcher` retorna `null` si no hay `activeOrg` y los layouts `/[slug]/*` redirigen a `/account/organizations` cuando no hay memberships activas. Esa fuga (workspace → account sin shell) es exactamente lo que esta change tapa.

## Goals / Non-Goals

**Goals:**
- `/account/profile`, `/account/organizations`, `/account/invitations` se renderizan dentro de `AppShell`.
- Resolución de org activa para el shell de cuenta sigue una cascada determinística: `session.activeOrganizationId` (si membership activa) → `user.lastActiveOrganizationId` (si membership activa) → primera org activa por orden alfabético → `null`.
- Caso "cero orgs activas" dentro de `/account/*` se soporta: `AppShell` se renderiza igual, `TeamSwitcher` muestra placeholder "Sin institución", sidebar sin items de workspace.
- Caso "cero orgs activas" intentando acceder a `/[slug]/*` redirige a `/no-organization` (no `notFound()`).
- `headerLabel` del shell de cuenta es dinámico por subpágina ("Perfil" / "Mis instituciones" / "Mis invitaciones"), resuelto por `usePathname` en un client component que se monta en el header del shell.
- La navegación al cuenta sigue viviendo en el `NavUser` (dropdown del avatar). No hay sidebar nuevo.

**Non-Goals:**
- Cambiar el contenido funcional de las páginas de cuenta (forms, listas, dialogs).
- Cambiar el routing o guards de `/super/*`.
- Cambiar el `NavUser` o `getUserMenuItems` (los links a `/account/*` ya existen).
- Preservar el link "Volver al panel" como UI explícita. El brand del sidebar (clickable a `/<slug>`) y el team switcher cumplen ese rol cuando hay slug; cuando no hay, el usuario no tiene panel al cual volver.
- Migrar la lógica de "elegir dashboard" (`deriveDashboardHref` / `redirectToDashboard`); siguen siendo autoridad en `/post-login` y compañía.
- Cambios a `/super/(public)/*` (rutas públicas dentro de super).

## Decisions

### Decisión 1: `AppShell` se mantiene como server component; el `headerLabel` se vuelve dinámico vía slot, no mutando `AppShell`

`AppShell` recibe `headerLabel: string` hoy. Hacerlo `ReactNode` permite que el layout de cuenta pase un client component `<AccountHeaderLabel />` que use `usePathname()` para decidir el texto.

**Alternativas consideradas:**
- (a) Resolver el label en el server reading el `pathname` desde `headers()`. Rechazado: Next 16 no expone `pathname` de forma confiable en RSC sin un client hop, y forzaría leer headers no estándar.
- (b) Cada `page.tsx` exporta su título y el layout lo lee. Rechazado por el usuario en la conversación: prefiere resolver por ruta.
- (c) Convertir `AppShell` entero en client component. Rechazado: rompe `import "server-only"` y el contrato existente con member/admin/super.

**Elegida**: `AppShell.headerLabel: ReactNode`. El layout de cuenta pasa un client component minúsculo. Los layouts existentes siguen pasando `string` (compatible). Cambio retro-compatible.

### Decisión 2: Resolución de org activa centralizada en un helper, no inline en el layout

Nuevo `resolveAccountShellOrg({ session, memberships, activeOrgs })` en `lib/auth/account-shell.ts` (o reutilizar `resolveActiveOrganization` extendiéndolo). Retorna `{ activeOrgId: string | null, activeOrgSlug: string | null, role: string | null, orgs: ActiveOrg[] }`.

Cascada:
1. `session.activeOrganizationId` si corresponde a una membership activa
2. `user.lastActiveOrganizationId` si corresponde a una membership activa
3. Primera membership activa ordenada por `organization.name` ASC
4. `null` (cero orgs activas)

**Por qué centralizado**: la misma cascada se va a necesitar al detectar "cero orgs" en `/[slug]/*` (para distinguir "slug no existe" de "usuario sin orgs") y eventualmente en otros lugares. Un helper puro y testeable.

**Alternativa**: reusar `resolveActiveOrganization` actual. Hoy retorna `{ activeOrgId, activeOrgRole }` sin slug. Si lo extendemos a retornar también `slug` y `orgs`, evitamos duplicar. Preferencia: extender el existente si la firma cambia poco; nuevo helper si el cambio es invasivo. La decisión final se toma en la fase de tasks.

### Decisión 3: `TeamSwitcher` soporta estado "sin institución" en lugar de retornar `null`

Hoy: `if (!activeOrg) return null;`. Cambio: cuando `teams.orgs.length === 0` (o no hay `activeOrg`), renderizar el botón con avatar genérico (icono `BuildingsIcon`), label "Sin institución", subtítulo "No perteneces a ninguna institución", y sin dropdown interactivo (`disabled`, sin trigger funcional).

**Por qué no esconderlo**: el shell de cuenta sin team switcher se ve "roto" — un hueco visual donde antes había un botón. El placeholder mantiene la cuadrícula del sidebar header coherente.

**Trade-off**: agrega copy que requiere mantener tono ("Sin institución" — neutro, sin voseo, alineado al copy "institución"/"organización" del proyecto).

### Decisión 4: `AppSidebar` acepta `sidebarConfig.items: []`, no se requiere nuevo prop

El sidebar de cuenta cuando hay org activa usa `buildAppSidebarConfig(activeOrgSlug)` — los mismos items del workspace. Cuando no hay org, el config se construye con `items: []` (solo brand). El brand sigue apuntando a `/<slug>` o a un fallback (`/post-login` o `/no-organization`).

**Por qué no un sidebar nuevo de cuenta**: el usuario confirmó que la navegación de cuenta vive en `NavUser`. El sidebar de cuenta serviría solo para "volver al workspace" — y eso ya lo da el team switcher + el brand link.

**Trade-off**: ningún item queda activo (el pathname matchea `/account/*`, los items apuntan a `/<slug>/*`). Es semánticamente correcto (no estás en el workspace) pero visualmente un pelo extraño. Aceptable.

### Decisión 5: Nueva ruta `/no-organization` reemplaza `notFound()` solo en el caso "cero orgs activas"

`app/no-organization/page.tsx`: server component, requiere sesión, redirige a `/post-login` si el usuario sí tiene orgs activas (defensa contra entradas directas). Página simple: título, copy explicativo, CTA a `/account/invitations` y link secundario a `/account/profile`.

En `app/[slug]/layout.tsx`, antes del `notFound()` por "no soy miembro":
1. Verificar si el usuario tiene **alguna** membership activa (no solo en ESA org).
2. Si tiene cero memberships activas en cualquier org → `redirect("/no-organization")`.
3. Si tiene memberships pero no en esta org específica → `notFound()` (comportamiento actual, no expone existencia de la org).

Esto preserva la propiedad de seguridad del `notFound()` actual: un usuario con orgs propias que intenta acceder a una org ajena sigue viendo 404.

**Alternativa**: redirigir a `/account/organizations` (status quo del layout `/app`). Rechazado: la lista de "Mis organizaciones" está vacía en este caso, no aporta. La página dedicada explica el estado.

### Decisión 6: El brand del sidebar en `/account/*` apunta a `/<slug>` cuando hay org, o a `/account/profile` si no

`buildAppSidebarConfig(slug)` tiene `brand.href = "/${slug}"`. Cuando se llama desde el layout de cuenta sin slug resuelto, necesitamos otro href. Opciones:

- `/no-organization` — informativo pero un loop visual desde el shell de cuenta
- `/account/profile` — "estás en cuenta, este es tu home de cuenta"
- `/post-login` — delega al resolver

**Elegida**: `/account/profile`. Hace al brand consistente con "el usuario está en su cuenta, no en un workspace". Sin slug, "cuenta" es el contexto. Para esto exponemos `buildAccountFallbackSidebarConfig()` (sin slug, items vacíos, brand → `/account/profile`).

## Risks / Trade-offs

- **[Inconsistencia visual: ningún item del sidebar activo en `/account/*`]** → Aceptado. Documentado en spec. El usuario entiende el modelo (workspace items son referencia, no navegación principal de la sección).
- **[Pérdida del link explícito "Volver al panel"]** → Mitigado por brand del sidebar (clickable a `/<slug>`) cuando hay org, y por team switcher cuando hay varias. Usuarios sin org tampoco tenían dashboard al cual volver.
- **[`TeamSwitcher` en estado "sin institución" puede confundir]** → Mitigado con copy claro ("Sin institución", subtítulo "No perteneces a ninguna institución"). Si el feedback futuro pide CTA explícito ("Ver invitaciones"), se agrega en una iteración posterior.
- **[Cascade de resolución de org puede chocar con la cascada existente en `/app` layout legacy]** → `/app/layout.tsx` ya no existe (eliminado en `app-shell` spec). La cascada de `resolveActiveOrganization` es la única autoridad y la reusamos.
- **[Redirect a `/no-organization` desde `/[slug]/*` puede crear loop si la página no chequea su precondición]** → `/no-organization/page.tsx` redirige a `/post-login` si el usuario SÍ tiene orgs activas. Defensa explícita contra entrada directa con estado inconsistente.
- **[El placeholder del TeamSwitcher requiere actualizar fixtures/tests de snapshot]** → Bajo riesgo, el componente no tiene tests de snapshot actualmente.
- **[Spec `account-shell` actual define el layout minimal en detalle y describe `deriveMenuRole` y NavUser]** → La delta debe ser quirúrgica: REMOVE solo los requirements del layout minimal (header con "Volver al panel"), MODIFY el "Layout compartido `/account/*`" para describir el nuevo shell. Los requirements de `NavUser`, `deriveMenuRole`, sign-out y persistencia de última org NO cambian.
