## 1. Fundación UI (shadcn + primitivas)

- [x] 1.1 Ejecutar `npx shadcn@latest add sidebar-07` y verificar que aparezcan los componentes en `components/ui/` (sidebar, breadcrumb, collapsible, dropdown-menu si faltaba)
- [x] 1.2 Verificar deps en `package.json` y que el build sigue limpio
- [x] 1.3 Crear `components/ui/empty-state.tsx` con props `icon?`, `title`, `description?`, `action?` y estilos centrados
- [x] 1.4 Crear `components/layout/app-sidebar.tsx` adaptando el output de sidebar-07 para recibir `config: SidebarConfig` por props (sin data hardcoded)
- [x] 1.5 Definir tipo `SidebarConfig` en `components/layout/types.ts` con `brand`, `items`, `user`
- [x] 1.6 Crear `components/layout/contexts/super.ts` con la config del super (item "Organizaciones" → `/super/organizations`)
- [x] 1.7 Crear `components/layout/contexts/admin.ts` y `components/layout/contexts/app.ts` con configs stub (al menos 1 ítem placeholder cada una)
- [x] 1.8 Implementar lógica de "ítem activo" en `AppSidebar` usando `usePathname()` y `matchPrefix` del config

## 2. Reestructura de `/super` con route groups

- [x] 2.1 Crear carpetas `app/super/(protected)/` y `app/super/(public)/`
- [x] 2.2 Mover el guard `requireSuperAdmin` del actual `app/super/layout.tsx` a `app/super/(protected)/layout.tsx`
- [x] 2.3 Refactor `app/super/layout.tsx` para ser shell raíz neutral (sin verificación de rol, sin sidebar — los sublayouts deciden)
- [x] 2.4 `app/super/(protected)/layout.tsx` debe envolver children con `AppSidebar` usando `superConfig` y hacer `requireSuperAdmin`
- [x] 2.5 `app/super/(public)/layout.tsx` con shell simple (sin sidebar, sin guard)
- [x] 2.6 Mover `app/accept-invitation/page.tsx` (super) a `app/super/(public)/accept-invitation/page.tsx`
- [x] 2.7 Mover server actions del flujo super (`acceptSuperInvitation` etc.) junto a la nueva ruta
- [x] 2.8 Crear `app/super/(protected)/page.tsx` que redirija a `/super/organizations`
- [x] 2.9 Verificar que `app/super/setup/` sigue accesible (no debería caer bajo route group; queda al nivel de `/super`)

## 3. Specs `super-invitations`: renombre de URL

- [x] 3.1 Actualizar el email template del super-invitation para emitir `${baseUrl}/super/accept-invitation?token=...`
- [x] 3.2 Si el código tenía la URL hardcoded en otro lugar, reemplazarla
- [x] 3.3 Crear `app/accept-invitation/page.tsx` con la siguiente lógica:
    - Si `searchParams.token` existe → `redirect("/super/accept-invitation?token=" + token, "replace")` o equivalente con 308
    - Si `searchParams.invitationId` existe → flujo nativo (delegar a componente del paso 6)
    - Si ninguno → mostrar error con CTA a `/login`

## 4. Schema y dependencias de plugin `organization`

- [x] 4.1 Verificar que `lib/auth/server.ts` configura `organization()` con roles `admin` y `member` (ya está; sólo confirmar)
- [x] 4.2 Verificar config de elevación: `admin({ adminRoles: ["super_admin"] })` (ya está)
- [x] 4.3 Probar en sandbox: `auth.api.createOrganization` desde sesión de super_admin. Documentar si crea fila en `member` para el super; si lo hace, planificar limpieza en server action (paso 5.3)
- [x] 4.4 Probar `auth.api.createInvitation` con headers de sesión super; si falla por membership, preparar fallback (insert directo)

## 5. Server actions de organizaciones

- [x] 5.1 Crear `app/super/(protected)/organizations/actions.ts`
- [x] 5.2 Implementar `createOrganizationWithAdmin({ name, slug, adminEmail, adminName })`:
    - `requireSuperAdmin()`
    - Validar slug único (zod + check)
    - `auth.api.createOrganization({ body: { name, slug }, headers })` 
    - Si crea `member` para super → eliminarlo en la misma tx
    - `auth.api.createInvitation({ body: { email: adminEmail, role: "admin", organizationId }, headers })` con fallback a insert directo
    - Disparar email vía `lib/email/*`
    - Retornar `{ organizationId, invitationId }`
- [x] 5.3 Implementar `resendOrgInvitation({ invitationId })`: validar `requireSuperAdmin`, rechazar si `status !== "pending"` o expirada, reenviar email con MISMO link, NO modificar BD
- [x] 5.4 Implementar `deleteOrgInvitation({ invitationId })`: validar `requireSuperAdmin`, rechazar si `status !== "pending"`, borrar fila
- [x] 5.5 Implementar `listOrganizations()`: query directo a `organization` con left join a `member` para detectar orgs sin admin
- [x] 5.6 Implementar `getOrganizationDetail({ organizationId })`: org + members + invitations en una llamada

## 6. UI de organizaciones en `/super`

- [x] 6.1 `app/super/(protected)/organizations/page.tsx`: server component que llama `listOrganizations()` y renderiza tabla shadcn o `EmptyState` según resultado
- [x] 6.2 Badge "Sin admin" en filas de org sin miembro con `role = "admin"`
- [x] 6.3 `app/super/(protected)/organizations/new/page.tsx`: form con `name`, `slug` (autogenerado editable), `adminName`, `adminEmail` usando `react-hook-form` + `zod`
- [x] 6.4 Manejar feedback: éxito → redirect a `/super/organizations/[id]`; error de slug → inline; error de email → warning con CTA copy/resend
- [x] 6.5 `app/super/(protected)/organizations/[id]/page.tsx`: header con `name`, `slug`, fecha; tabs shadcn "Miembros" / "Invitaciones"
- [x] 6.6 Tab Miembros: tabla con `name`, `email`, `role`, `joinedAt`
- [x] 6.7 Tab Invitaciones: tabla con `email`, `role`, `status` (badge), `expiresAt`, columna de acciones
- [x] 6.8 Acción "Copiar link" (client component): copia `${origin}/accept-invitation?invitationId={id}` y dispara toast
- [x] 6.9 Acción "Reenviar": llama `resendOrgInvitation`, muestra toast
- [x] 6.10 Acción "Eliminar": confirm dialog shadcn, llama `deleteOrgInvitation`, refresca lista; deshabilitada si `status !== "pending"`
- [x] 6.11 `EmptyState` en tab Invitaciones cuando no hay filas
- [x] 6.12 Iconos Phosphor (`Buildings`, `UserPlus`, `LinkSimple`, `PaperPlaneTilt`, `Trash`)

## 7. Aceptación nativa en `/accept-invitation`

- [x] 7.1 Detección de query en `app/accept-invitation/page.tsx` (caso `invitationId`)
- [x] 7.2 Server-side: leer invitación por `invitationId` (vía `auth.api.getInvitation` o query directo)
- [x] 7.3 Si `status !== "pending"` o expirada → render error con CTA a `/login`
- [x] 7.4 Si usuario logueado → botón "Aceptar invitación" + server action `acceptOrgInvitation`
- [x] 7.5 Si usuario NO logueado → form de signup (email/password, con `email` pre-llenado editable) + botón "Continuar con Google"
- [x] 7.6 Server action `acceptOrgInvitation({ invitationId, ... })`:
    - Re-validar invitación
    - Caso usuario logueado: `auth.api.acceptInvitation({ body: { invitationId }, headers })`
    - Caso signup email/password: crear user + account + member(role="admin") + marcar invitación accepted en una transacción
    - Sin validar coincidencia de email
- [x] 7.7 Flujo Google: persistir `invitationId` en cookie HttpOnly (`pending-invitation-id`, SameSite=Lax, 15min) antes del redirect OAuth
- [x] 7.8 Callback OAuth: leer cookie, aceptar invitación, limpiar cookie, redirect a `/admin`
- [x] 7.9 Fallback si cookie perdida: pantalla informativa "Vuelve a hacer click en el link del email"
- [x] 7.10 Test manual: aceptar con email distinto al invitado, verificar que `member` se crea con el `userId` del aceptante

## 8. Email templates

- [x] 8.1 Renombrar/actualizar template existente de super-invitation con URL nueva
- [x] 8.2 Crear template `org-admin-invitation` con: asunto referenciando nombre de org, copy español neutral, link a `${baseUrl}/accept-invitation?invitationId={id}`, aviso de expiración 7 días
- [x] 8.3 Integrar en `lib/email/*` el sender para org-admin invitation

## 9. Stubs de sidebar en /admin y /app

- [x] 9.1 Actualizar `app/admin/layout.tsx` para usar `AppSidebar` con `adminConfig`
- [x] 9.2 Actualizar `app/app/layout.tsx` para usar `AppSidebar` con `appConfig`
- [x] 9.3 Verificar que las páginas placeholder existentes siguen renderizando dentro del nuevo shell

## 10. Verificación y QA manual

- [x] 10.1 `npm run build` sin errores
- [x] 10.2 `npm run lint` sin warnings nuevos
- [ ] 10.3 Manual: super crea org + invita admin → recibe email → acepta con email/password → queda como admin en /admin
- [ ] 10.4 Manual: mismo flujo con Google
- [ ] 10.5 Manual: copiar link, abrir en incógnito, aceptar → ok
- [ ] 10.6 Manual: reenviar invitación → email llega con el MISMO link
- [ ] 10.7 Manual: eliminar invitación pending → desaparece; intentar eliminar accepted → rechazado
- [ ] 10.8 Manual: URL legacy `/accept-invitation?token=...` redirige a `/super/accept-invitation?token=...`
- [ ] 10.9 Manual: `/super/accept-invitation` accesible sin sesión
- [ ] 10.10 Manual: `/super/organizations` con BD vacía muestra EmptyState con CTA funcional
- [ ] 10.11 Manual: super_admin NO aparece en `member` de la org que creó
- [ ] 10.12 Manual: copy en español neutral en todas las pantallas nuevas (sin voseo)
