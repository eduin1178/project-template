## Context

El `/super` actual sólo expone un dashboard mínimo. El modelo multi-tenant (orgs via plugin `organization` de better-auth) ya está en BD pero no tiene UI de gestión. Este cambio agrega CRUD de orgs y el ciclo de vida de invitaciones de admin, reutilizando lo nativo del plugin y elevando permisos con el plugin `admin` (configurado con `adminRoles: ["super_admin"]` en `lib/auth/server.ts:86-88`).

Constraints relevantes:
- `auth-roles`: super_admin NO tiene filas en `member`.
- `route-protection`: `/super/*` está bajo guard de rol en el layout RSC.
- `super-invitations`: hoy usa tabla propia `superInvitation` y ruta `/accept-invitation`.
- UI: shadcn-first, iconos Phosphor, copy en español neutral.

## Goals / Non-Goals

**Goals:**
- Super_admin puede crear orgs, listar orgs, ver detalle por org (miembros + invitaciones), invitar al admin, copiar link, reenviar, eliminar pending.
- Aceptación de invitación de org soporta usuarios nuevos (email/password y Google) y existentes, sin chequeo de coincidencia de email, atómico.
- Sidebar shell reutilizable entre `/super`, `/admin`, `/app`.
- Renombrar la ruta de aceptación super sin romper invitaciones ya emitidas (los emails viejos contienen el link viejo — ver migración).

**Non-Goals:**
- Vista global de "todos los usuarios" del sistema (queda fuera; la lista por-org ya cubre lo pedido).
- Invitaciones admin→member dentro de una org (fase posterior).
- Edición/baja de orgs existentes más allá de borrar invitaciones pending.
- Switcher de org en `/admin` (placeholder en sidebar config; sin lógica).
- Migración de datos en `superInvitation` (la tabla queda igual; sólo cambia la URL pública).

## Decisions

### D1. Tabla `invitation` nativa del plugin para org-admin (vs tabla propia)

Elegido: **nativa**. Reutilizamos la infraestructura del plugin `organization` (creación, expiración, aceptación, FKs). La invitación lleva `role = "admin"`.

Alternativa descartada: tabla propia `orgAdminInvitation` espejo de `superInvitation`. Más control, pero duplica lógica que better-auth ya implementa y nos saca del happy path del plugin.

### D2. Elevación del super_admin para llamar `createInvitation` sin membership

Camino primario: **API del plugin con sesión de super_admin**. El plugin `admin` con `adminRoles: ["super_admin"]` autoriza operaciones globales. `auth.api.createInvitation({ body: { email, role: "admin", organizationId }, headers })` se invoca con headers de la sesión del super.

Fallback (si la API del plugin sigue exigiendo membership pese a la elevación): **insert directo en la tabla `invitation`** desde una server action elevada, generando `id` con `crypto.randomUUID()`, `expiresAt = now + 7d`, `status = "pending"`, `inviterId = super.id`. La aceptación nativa por `invitationId` igual funciona porque sólo lee la fila.

Verificación: durante apply se prueba el camino primario; si falla, se aplica el fallback sin cambiar specs (ambos satisfacen el mismo contrato observable).

### D3. Org y invitación se crean eager y son independientes

La server action `createOrganizationWithAdmin` ejecuta en transacción:
1. `auth.api.createOrganization({ body: { name, slug }, headers })`.
2. `createInvitation` (o insert directo) para `email` con `role = "admin"`.
3. Envío de email con link `${baseUrl}/accept-invitation?invitationId=${id}`.

Si la invitación falla post-org, no rollbackeamos la org (queda visible en el listado; el super puede invitar de nuevo desde el detalle). Esto evita que el super tenga que reingresar nombre/slug.

Alternativa descartada: lazy (persistir payload de org en la invitación y crear org sólo al aceptar). Más limpio en BD pero complica reenvíos y lista de orgs.

### D4. Aceptación nativa en `/accept-invitation`

Ruta pública nueva. Flujo:

```
GET /accept-invitation?invitationId=X
├─ buscar invitación → si no existe / expirada / accepted → mensaje + CTA /login
├─ si usuario está logueado → botón "Aceptar"
│     └─ POST acceptOrgInvitation → auth.api.acceptInvitation
└─ si no logueado → form de signup (email/password) + botón Google
      ├─ email/password → server action acceptOrgInvitation
      │     ├─ tx: create user (role="user" default), create account, create member(role="admin")
      │     └─ marca invitation.status = "accepted"
      └─ Google OAuth → state lleva invitationId; callback acepta tras OAuth
```

El `invitationId` se persiste en cookie HttpOnly (`pending-invitation-id`, SameSite=Lax, expira en 15 min) antes del redirect a Google. Al volver del callback, el server lee la cookie y llama `acceptInvitation`. Si la cookie no está, mostrar pantalla de "vuelve a hacer click en el link de tu email".

Sin validación de coincidencia entre email invitado y email autenticado (igual que super-invitations: el `invitationId` es la autoridad).

### D5. Renombre `/accept-invitation` → `/super/accept-invitation`

Mueve `app/accept-invitation/*` a `app/super/(public)/accept-invitation/*`. El email template del `super-invitations` ahora genera links a `${baseUrl}/super/accept-invitation?token=...`.

**Migración de invitaciones en vuelo:** se agrega un **redirect permanente** en `app/accept-invitation/page.tsx` que detecta `?token=` (sin `invitationId`) y redirige a `/super/accept-invitation?token={token}`. El nuevo endpoint en `/accept-invitation` distingue por query param: `token` → es legacy super (redirect), `invitationId` → flujo nativo (sigue). Después de 7 días (TTL de invitations super), el redirect puede removerse.

### D6. Route groups en `/super`

```
app/super/
├─ layout.tsx                       ← shell (sidebar + user menu)
├─ (protected)/
│   ├─ layout.tsx                   ← requireSuperAdmin()
│   ├─ page.tsx                     ← redirect a /super/organizations
│   ├─ organizations/
│   │   ├─ page.tsx
│   │   ├─ new/page.tsx
│   │   └─ [id]/page.tsx            ← tabs miembros/invitaciones
│   └─ super-invitations/           ← (CTA actual migra aquí, opcional en esta fase)
├─ (public)/
│   ├─ layout.tsx                   ← layout simple, sin sidebar, sin guard
│   └─ accept-invitation/page.tsx   ← flujo super
└─ setup/                           ← ya existe, queda igual
```

El layout raíz `app/super/layout.tsx` decide rama por route group: para grupo `(public)` no inyecta sidebar; para `(protected)` sí. La verificación de rol vive en `(protected)/layout.tsx`.

### D7. `AppSidebar` shell parametrizable

Vive en `components/layout/app-sidebar.tsx`. Acepta:

```ts
type SidebarConfig = {
  brand: { label: string; href: string; icon?: ReactNode };
  items: Array<{ label: string; href: string; icon?: ReactNode; matchPrefix?: string }>;
  user: { name: string; email: string; image?: string | null };
};
```

Las configs por segmento viven en `components/layout/contexts/{super,admin,app}.ts`. `/admin` y `/app` reciben config con un único ítem placeholder y mantienen sus páginas placeholder existentes.

Implementación: `npx shadcn@latest add sidebar-07` instala el block. Refactorizamos el `app-sidebar` resultante para tomar `SidebarConfig` por props en lugar de hardcoded data.

### D8. `EmptyState` primitiva

`components/ui/empty-state.tsx`:
```ts
type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};
```

Se usa en Organizations (vacío → "Aún no tienes organizaciones") y en tab de Invitaciones del detalle (vacío → "Sin invitaciones pendientes"). Compón con `Card` o stand-alone (centered) según contexto.

### D9. Server actions y guards

Todas las actions de org-management viven en `app/super/(protected)/organizations/actions.ts` y comienzan con `requireSuperAdmin()` (ya existe en `lib/auth/guards.ts`).

`acceptOrgInvitation` (público) NO usa `requireSuperAdmin`; valida invitación por `invitationId` directamente.

### D10. Reenviar invitación no rota el ID

`resendOrgInvitation({ invitationId })`:
1. Valida `requireSuperAdmin`.
2. Lee la invitación; si está `accepted` o expirada, rechaza.
3. Re-envía email con el mismo link.
4. (Opcional) Refresca `expiresAt`. Decisión: **NO refrescar** en esta fase — el super puede eliminar + crear nueva si necesita renovar tiempo. Reduce complejidad y previene ambigüedad.

### D11. Copy link

UI lado super: botón con icono `LinkSimple` de Phosphor. Click copia `${origin}/accept-invitation?invitationId=${id}` al portapapeles y muestra toast con `sonner`. No requiere server roundtrip.

## Risks / Trade-offs

- **[Elevación del plugin `admin` no cubre `createInvitation`]** → Fallback documentado en D2: insert directo en `invitation`. Sin cambios en specs porque el contrato observable (invitación creada y aceptable) es el mismo.
- **[Org sin admin tras invitación expirada]** → Aceptado por diseño. El super la ve en la lista; puede reinvitar desde el detalle. Documentar en UI con un badge "Sin admin" si la org no tiene miembros con `role = "admin"`.
- **[Cookie de pending-invitation y OAuth Google]** → SameSite=Lax permite el redirect post-OAuth de Google (es top-level navigation). Verificar en testing. Si falla, fallback: usar `state` de OAuth con `invitationId` codificado.
- **[Renombre rompe links viejos]** → Mitigado con redirect en `/accept-invitation?token=`. Los emails ya enviados siguen funcionando 7 días (TTL del token super). Tras eso, expira de todas formas.
- **[Sidebar-07 trae deps]** → Instala `breadcrumb`, `collapsible`, `dropdown-menu` (este último ya está). Aceptable; primitivas reutilizables.
- **[`auth.api.createOrganization` requiere creator como owner]** → El plugin agrega al creator (el super) como `owner` del `member`. Esto **contradice** `auth-roles` (super NO debe tener membership). Mitigación: tras crear la org, eliminar la fila de `member` del super en la misma transacción. Verificar comportamiento real en testing.

## Migration Plan

1. Instalar shadcn `sidebar-07` y refactor a `AppSidebar` shell.
2. Crear `EmptyState`.
3. Reestructurar `app/super/` con route groups `(protected)` y `(public)`.
4. Mover `app/accept-invitation/` a `app/super/(public)/accept-invitation/`.
5. Crear `app/accept-invitation/page.tsx` (redirect-legacy + flujo nativo nuevo).
6. Implementar server actions de orgs e invitaciones.
7. Implementar tabs de detalle de org.
8. Actualizar email template de super-invitation con nueva URL.
9. Crear email template de org-admin invitation.
10. Stubs de sidebar en `/admin` y `/app`.

Rollback: revertir migrations no aplica (no hay schema changes). Revert de commits es suficiente. Los emails ya enviados con la URL nueva quedarían rotos; mitigable manteniendo el redirect en `/accept-invitation?token=` un tiempo extra.

## Open Questions

- ¿`auth.api.createOrganization` con elevación de admin plugin permite NO crear el `member` del creator, o hay que limpiarlo post-hoc? (Resuelve en apply; ambas opciones cumplen el contrato.)
- ¿Mover el CTA "invitar super_admin" del dashboard actual a un menú propio en el sidebar (`Super admins`) o dejarlo donde está? Por ahora: dejarlo, no es bloqueante; sidebar sólo tiene "Organizaciones".
