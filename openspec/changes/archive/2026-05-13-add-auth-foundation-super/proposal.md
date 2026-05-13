## Why

La plataforma necesita autenticación real con un modelo de roles claro (super_admin global, admin de tenant, user de tenant) y multi-tenancy preparado desde el inicio. La fase anterior dejó el contrato `useAuthStatus()` como stub; ahora se conecta a la fuente real para habilitar el acceso al panel `/super` y bloquear todo lo que no esté autorizado. Sin esto, no se puede operar la plataforma ni dar soporte interno.

## What Changes

- Integrar **better-auth** como sistema de autenticación, con plugins `admin` (rol global) y `organization` (tenants).
- Integrar **Drizzle ORM** sobre **Postgres**; schema generado por `@better-auth/cli generate` y commiteado en el repo.
- Añadir **docker-compose.yml** en la raíz para Postgres en dev; intercambiable a Neon/Supabase/Railway vía `DATABASE_URL` sin cambios de código.
- Habilitar **email/password + Google OAuth** a nivel servidor para los tres roles. Verificación de email y recuperación de contraseña estándar de better-auth.
- Crear ruta **`/login`** única para los tres roles, con redirect post-auth según rol: `super_admin → /super`, `admin → /admin`, `user → /app`.
- Crear ruta protegida **`/super`** con layout y dashboard mínimo (solo placeholder de bienvenida en esta fase).
- Crear ruta **`/super/setup`** activa SOLO mientras no exista ningún `super_admin`. Requiere `SUPER_ADMIN_SETUP_TOKEN` del `.env`. Devuelve 404 una vez creado el primer super_admin.
- Crear flujo de **invitaciones de super_admin a super_admin** desde `/super`. La invitación lleva un token único vinculado al rol; aceptar acepta email/pass o Google. El token es la verdad (no se valida coincidencia de email).
- Reservar rutas **`/admin`** y **`/app`** con placeholders mínimos (sin UI funcional). Existe el redirect, no la pantalla.
- Añadir archivo **`proxy.ts`** (Next 16 — reemplaza `middleware.ts`) para redirects de UX rápidos en rutas protegidas.
- Aplicar **defense in depth**: `proxy.ts` + layout RSC + verificación dentro de cada server action. Confirmado contra Next 16 docs (proxy NO cubre server functions de forma confiable).
- **BREAKING (interno)**: Actualizar el contrato `useAuthStatus` para que `dashboardHref` se derive del rol real de la sesión. Mantiene la directiva `"use client"` y el patrón `AuthCta`.
- Toda la UI con **shadcn/ui** (consumido vía MCP). Copy en español neutral (tú, no vos).

## Capabilities

### New Capabilities

- `auth`: Sistema de autenticación con better-auth — sign in, sign up, verificación de email, recuperación de contraseña, sesiones, social login (Google), email/password.
- `auth-roles`: Modelo de roles globales (`super_admin`) y multi-tenant (`admin`, `user` vía organization plugin). Reglas de elevación y boundary entre platform role y tenant role.
- `super-setup`: Bootstrap del primer super_admin vía token de entorno; endpoint que se auto-desactiva tras el primer super registrado.
- `super-invitations`: Invitaciones de super_admin a super_admin, con token único y aceptación por email/pass o Google.
- `super-panel`: Layout, navegación propia y dashboard mínimo de `/super`, separados del layout público.
- `route-protection`: Patrón defense-in-depth (proxy + layout RSC + server actions) para proteger rutas y operaciones según rol.
- `db-foundation`: Configuración de Postgres + Drizzle ORM + docker-compose dev + migraciones; base para toda persistencia del producto.

### Modified Capabilities

- `auth-status-contract`: El hook `useAuthStatus` deja de ser stub. Ahora deriva su estado de la sesión real de better-auth y calcula `dashboardHref` según el rol del usuario.

## Impact

- **Código nuevo**:
  - `next-app/lib/auth/` — configuración server y client de better-auth.
  - `next-app/lib/db/` — instancia de Drizzle, schema generado, helpers.
  - `next-app/app/(auth)/login/` — login unificado para los tres roles.
  - `next-app/app/super/` — layout, dashboard, setup, invitaciones.
  - `next-app/app/admin/`, `next-app/app/app/` — placeholders.
  - `next-app/app/api/auth/[...all]/route.ts` — handler de better-auth.
  - `next-app/proxy.ts` — redirects de UX.
- **Código modificado**: `next-app/lib/auth/use-auth-status.ts` (deja de ser stub; mantiene contrato).
- **Dependencias nuevas**: `better-auth`, `drizzle-orm`, `drizzle-kit` (dev), `postgres` o `pg`, `@better-auth/cli` (dev).
- **Infra nueva**: `docker-compose.yml` en raíz, `.env.example` con todas las variables, scripts npm para migraciones.
- **Variables de entorno**: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SUPER_ADMIN_SETUP_TOKEN`, `EMAIL_*` (proveedor SMTP para verificación/recuperación).
- **Specs afectadas**: `auth-status-contract` (delta — el stub pasa a implementación real).
- **Fuera de scope**: UI funcional de `/admin` y `/app`, CRUD de tenants desde `/super`, invitaciones a admins de tenant, 2FA, passkeys, magic link.
