<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes ? APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md ? next-app

Reglas técnicas para trabajar dentro de `next-app/`. Estas reglas complementan el `AGENTS.md` de la raíz y tienen prioridad para cambios en esta aplicación.

## Stack verificado

La aplicación usa:

- Next.js `16.2.6`
- React `19.2.4`
- TypeScript `5`
- Tailwind CSS `4`
- shadcn/ui manual sobre componentes en `components/ui/`
- Radix mediante paquete umbrella `radix-ui`
- Phosphor Icons mediante `@phosphor-icons/react`
- `react-hook-form`
- `zod`
- `next-themes`
- Nextjs 16 no usa middleware.ts en su lugar usa proxy.ts

## Verificación de Next.js

Cuando toques APIs de Next.js 16, verifica la documentaci?n local instalada en `node_modules/next/dist/docs/` antes de afirmar o implementar comportamiento.


## UI: shadcn-first

- Toda primitiva de UI disponible en shadcn debe consumirse desde `@/components/ui/*`.
- Prohibido crear componentes propios que dupliquen una primitiva de shadcn.
- Extender mediante composición sí; reimplementar no. 
- Si una primitiva nueva está en el registry configurado en `components.json`, agrégala con `npx shadcn@latest add <name>`. Usa el MCP de Shadcn si está disponible para obtener componentes que no estén instalados. Si no está instalado el MCP pide al usuario que lo instalte. 
- Si no existe en el registry y no se encuentra con el mcp, escríbela a mano siguiendo el estilo de las primitivas ya instaladas.
- Composiciones espec?ficas del dominio van en `components/landing/`, `components/<feature>/`, etc. NUNCA mezcladas con `components/ui/`.
- `components/ui/` es para primitivas reutilizables, no para l?gica de producto.

## Iconos

- Usa `@phosphor-icons/react`.
- No introduzcas `lucide-react` ni otro set de iconos sin justificaci?n y aprobaci?n.

## Radix

- No agregues paquetes `@radix-ui/react-*` individuales salvo decisión explícita.

## Copy: "Institución" vs `organization`

Docentix está dirigido a instituciones educativas. Por eso el copy visible al usuario final dice **"Institución"** y no "Organización".

**Regla**: en todo texto visible al usuario final usa "Institución" / "institución" / "Instituciones" / "instituciones" en lugar de "Organización" / "organización" / "Organizaciones" / "organizaciones".

Aplica a:

- Páginas y componentes (`app/**/*.tsx`, `components/**/*.tsx`).
- Plantillas de email (`lib/email/templates/**`).
- Mensajes de validación, errores, empty states, tooltips, labels, títulos de diálogos, toasts.
- Documentación dirigida al usuario final.

**Excepciones** (se mantienen como `organization`):

- Identificadores de código: variables, funciones, props, tipos (`organizationId`, `organizationName`).
- Tablas y columnas de base de datos (`organization`, `organizationId`).
- Rutas de API y endpoints (`/api/organization/*`).
- Referencias al plugin `organization` de Better Auth.
- Comentarios técnicos en el código fuente.
- Specs en `openspec/specs/**`.
- Archivos `AGENTS.md` cuando describen el modelo técnico (no el copy visible).

El copy nuevo respeta el español neutral del proyecto: segunda persona singular `tú`, sin voseo.

## Org plataforma y rol super

Docentix se opera como un tenant más sobre su propia base. Por eso existe una
**organización plataforma** con `slug = "docentix"` y nombre `"Docentix"`. Todo
usuario con `user.role = "super_admin"` es `owner` activo de esa organización.

Constantes y helpers viven en `lib/auth/platform-org.ts`:

- `PLATFORM_ORG_SLUG = "docentix"`
- `PLATFORM_ORG_NAME = "Docentix"`
- `getOrCreatePlatformOrg(executor?)` — SELECT por slug, INSERT idempotente si falta.
- `ensurePlatformMembership(userId, executor?)` — garantiza la membresía `owner`/`active`.
- `ensurePlatformMembershipAndSetLastActive(userId, executor?)` — además setea `user.lastActiveOrganizationId`.

**Regla**: toda mutación que setea `user.role = "super_admin"` (setup, aceptación
de invitación super, cualquier flujo nuevo) DEBE llamar
`ensurePlatformMembershipAndSetLastActive(userId, tx)` dentro de la misma
transacción. Los helpers aceptan un executor (`db` o `tx`) para componerse.

`redirectToDashboard()` en `lib/auth/guards.ts` aplica defensa en profundidad:
si detecta un `super_admin` sin membresía activa, intenta auto-reparar via
`ensurePlatformMembership` antes de caer a `/super`.

`/super` es **panel de plataforma**, no un dashboard de workspace. El header
del shell dice "Plataforma Docentix". El sidebar del workspace muestra el ítem
"Panel de plataforma" solo para `super_admin`; el sidebar de `/super` muestra
"Volver a mi institución" (que apunta a `/<slug>` cuando hay org activa
resoluble, o a `/post-login` en su defecto).

## Routing por slug

El workspace de cada institución vive bajo `/[slug]/...`. El slug es la
**fuente de verdad** del contexto activo, no `session.activeOrganizationId`.

- `app/[slug]/layout.tsx`: valida que el slug exista y que el usuario sea
  miembro `active`; sincroniza `setActiveOrganization` por slug y persiste
  `user.lastActiveOrganizationId`.
- `app/[slug]/(member)/`: rutas member (dashboard + tareas). Layout propio con
  `AppShell` + `buildAppSidebarConfig(slug)`.
- `app/[slug]/admin/`: sección admin. Layout propio con gate por rol
  (`isOrgAdmin`) + `AppShell` con `buildAdminSidebarConfig(slug)`.
- `proxy.ts`: cualquier primer segmento NO reservado se trata como candidato a
  slug; sin sesión redirige a `/login?next=...`.

**Slug inmutable** por decisión de producto. La UI de edición de org NO permite
modificar slug. Si una institución necesita renombrarse, se renombra `name`.

**Slugs reservados**: `lib/auth/reserved-slugs.ts` exporta `RESERVED_SLUGS`,
`isReservedSlug` y `validateSlug` (kebab-case, 3-40 chars, no reservado). Toda
creación de org debe pasar por `validateSlug`.

### Convención: server actions reciben slug u orgId explícito

Toda nueva server action que opere sobre datos de una org SHALL recibir
`organizationSlug` o `organizationId` como argumento explícito y NO leer
`session.activeOrganizationId` directamente. Razón: las URLs slug-scoped
permiten múltiples tabs en orgs distintas, y la sesión flipea entre tabs. La
URL (`params.slug`) es la fuente confiable; pasarle el contexto a la action es
trivial desde el componente que ya tiene `params`.

Actions existentes pueden mantenerse usando `session.activeOrganizationId`
mientras no se demuestre un bug multi-tab. Cualquier action nueva debe
respetar la convención.

## Base de datos y seed

- Migraciones en `lib/db/migrations/` empezando por `0000_init.sql` (snapshot
  consolidado). La política "migraciones nunca se editan después de aplicadas"
  cuenta a partir de ese archivo.
- Tras `pnpm db:migrate` corré `pnpm db:seed-platform` para crear la org
  plataforma y enrolar a los supers existentes. El script es idempotente:
  re-ejecutarlo no duplica filas. Requiere `tsx` (incluido en devDependencies)
  y `.env.local` con `DATABASE_URL`.

## Clases CSS y Tailwind

- Usa `cn` desde `@/lib/utils` para composición de clases.
- Respeta tokens de tema definidos en `app/globals.css`.
- No metas valores mágicos si existe un token semántico (`background`, `foreground`, `primary`, etc.).
- Mantén compatibilidad con Tailwind CSS v4.
