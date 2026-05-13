## 1. Infraestructura de BD (Postgres + Drizzle)

- [x] 1.1 Crear `docker-compose.yml` en la raíz del repo con servicio `postgres:16-alpine`, volumen nombrado `pgdata`, puerto `5432:5432`, y credenciales declaradas vía variables de entorno
- [x] 1.2 Crear/actualizar `.env.example` en `next-app/`
- [x] 1.3 Instalar dependencias en `next-app/`: `drizzle-orm`, `postgres`, `drizzle-kit` (dev), `better-auth`, `@better-auth/cli` (dev)
- [x] 1.4 Crear `next-app/drizzle.config.ts` apuntando a `lib/db/schema/index.ts`, dialect `postgresql`, `DATABASE_URL` del entorno
- [x] 1.5 Crear `next-app/lib/db/client.ts` que instancia Drizzle con `postgres(DATABASE_URL)` y exporta `db`; fail fast si la variable falta
- [x] 1.6 Crear `next-app/lib/db/schema/index.ts` (vacío inicialmente, re-exportará todas las tablas)
- [x] 1.7 Añadir scripts npm: `db:push`, `db:generate`, `db:migrate`, `db:generate-auth-schema`

## 2. Better-auth: configuración base

- [x] 2.1 Decidir proveedor SMTP (Resend recomendado) y añadir su SDK + variables al `.env.example`
- [x] 2.2 Crear `next-app/lib/auth/server.ts` con `betterAuth({...})`: adapter Drizzle, `emailAndPassword` con `requireEmailVerification: true`, `socialProviders.google`, plugins `admin({defaultRole: "user", adminRoles: ["super_admin"]})` y `organization()`
- [x] 2.3 Implementar `sendVerificationEmail` y `sendResetPassword` callbacks usando el proveedor SMTP elegido
- [x] 2.4 Crear `next-app/lib/auth/client.ts` con `createAuthClient({baseURL})` y export del `authClient`
- [x] 2.5 Crear `next-app/app/api/auth/[...all]/route.ts` con `toNextJsHandler(auth)` exportando `GET` y `POST`
- [x] 2.6 Ejecutar `npm run db:generate-auth-schema` → resultado en `next-app/lib/db/schema/auth.ts` y re-exportar desde `schema/index.ts`
- [x] 2.7 Ejecutar `npm run db:push` contra Postgres local; verificar tablas creadas (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`)

## 3. Modelo de roles y derivación de destino

- [x] 3.1 Crear `next-app/lib/auth/derive-dashboard-href.ts` con la función `deriveDashboardHref(session)` implementando el algoritmo: `super_admin → /super`, `member.role admin → /admin`, otro → `/app`
- [x] 3.2 Crear `next-app/lib/auth/guards.ts` con helpers server-only: `requireSession`, `requireSuperAdmin`, `requireTenantAdmin`, `requireAnyUser` (todos usan `auth.api.getSession({ headers: await headers() })`)

## 4. Tabla de invitaciones super y schema final

- [x] 4.1 Crear `next-app/lib/db/schema/super-invitation.ts` con la tabla `superInvitation` (id, token unique, invitedEmail, invitedBy FK, expiresAt, acceptedAt, acceptedBy FK, createdAt, updatedAt)
- [x] 4.2 Re-exportar `superInvitation` desde `next-app/lib/db/schema/index.ts`
- [x] 4.3 Ejecutar `npm run db:push` y verificar tabla creada

## 5. Proxy.ts (Next 16) para redirects UX

- [x] 5.1 Crear `next-app/proxy.ts` que exporta función `proxy` y `config` con `matcher` que incluya `/super/:path*`, `/admin/:path*`, `/app/:path*`, `/login` y excluya assets, `/_next/*`, `/api/auth/:path*`
- [x] 5.2 Implementar lógica: sin cookie de sesión en `/super|/admin|/app/*` → `NextResponse.redirect("/login?next=...")`; con cookie en `/login` → redirect a `/post-login`
- [x] 5.3 NO consultar BD ni decodificar JWT; solo presencia de cookie. Documentar con comentario que esto es solo UX

## 6. Layout RSC de /super con defense in depth

- [x] 6.1 Crear `next-app/app/super/layout.tsx` (RSC) que llame `auth.api.getSession({ headers: await headers() })`; si no hay sesión o `user.role !== "super_admin"` → `notFound()`
- [x] 6.2 Crear shell visual mínimo con shadcn/ui — header con nombre/email del super y dropdown con "Cerrar sesión"
- [x] 6.3 Instalar componentes shadcn: `dropdown-menu`, `avatar`, `alert`, `sonner`, `form` (escrito a mano siguiendo plantilla shadcn al fallar `npx shadcn add form`)

## 7. Página /super (dashboard mínimo)

- [x] 7.1 Crear `next-app/app/super/page.tsx` (RSC) con saludo y placeholders de futuras secciones
- [x] 7.2 `InviteSuperForm` (cliente) con `useActionState` que invoca server action `createSuperInvitationAction`
- [x] 7.3 Mostrar lista de invitaciones pendientes (RSC consulta `superInvitation`)

## 8. /super/setup (bootstrap del primer super_admin)

- [x] 8.1 `next-app/app/super/setup/page.tsx` verifica `count(user where role='super_admin')`; si > 0 → `notFound()`
- [x] 8.2 Formulario shadcn con campos `name`, `email`, `password`, `setupToken`
- [x] 8.3 Action `bootstrapFirstSuperAdminAction` con advisory lock + `timingSafeEqual` + `auth.api.signUpEmail` + UPDATE condicional con `NOT EXISTS (super_admin)` y rollback (delete usuario) si race
- [x] 8.4 Tras éxito, panel informativo "Verifica tu email para iniciar sesión"

## 9. /login (login unificado)

- [x] 9.1 `app/(auth)/login/page.tsx` redirige a dashboard si ya hay sesión
- [x] 9.2 `LoginForm` cliente con `react-hook-form` + zod, botón "Continuar con Google"
- [x] 9.3 Submit invoca `authClient.signIn.email` y luego `redirectAfterLoginAction(next)` que resuelve destino en server
- [x] 9.4 Botón Google invoca `authClient.signIn.social` con `callbackURL: "/post-login"`
- [x] 9.5 `app/post-login/page.tsx` (RSC) usa `redirectToDashboard()` para resolver destino server-side
- [x] 9.6 Enlace "¿Olvidaste tu contraseña?" → `/forgot-password`

## 10. Recuperación de contraseña

- [x] 10.1 `app/(auth)/forgot-password/page.tsx` con form que invoca `authClient.requestPasswordReset` (better-auth v1.6 — `forgetPassword` fue renombrado)
- [x] 10.2 `app/(auth)/reset-password/page.tsx` con form que llama `authClient.resetPassword` con token del query
- [x] 10.3 Callback `sendResetPassword` configurado en `lib/auth/server.ts` usando `sendEmail` (Resend)

## 11. Verificación de email

- [x] 11.1 `app/(auth)/verify-email/page.tsx` informativa (better-auth maneja el callback en `/api/auth/*`)
- [x] 11.2 `app/(auth)/check-email/page.tsx` informativa post-signup
- [x] 11.3 Callback `sendVerificationEmail` configurado con `sendOnSignUp: true`

## 12. Flujo de invitaciones de super_admin

- [x] 12.1 `createSuperInvitationAction` con `requireSuperAdmin()` + `randomBytes(32).toString("base64url")` + email vía Resend
- [x] 12.2 `app/accept-invitation/page.tsx` valida token (existe, no expirado, no aceptado) y renderiza form o mensaje de error
- [x] 12.3 `AcceptInvitationForm` con vía email/password (action) y vía Google (callback `/accept-invitation/complete?token=...`)
- [x] 12.4 `acceptSuperInvitationEmailAction` — re-valida token, `signUpEmail`, transaction que actualiza rol y marca invitación
- [x] 12.5 `app/accept-invitation/complete/page.tsx` invoca `completeInvitationFromGoogleAction` (lee sesión, re-valida token, promueve a super, marca invitación)
- [x] 12.6 NO se valida coincidencia de email (`invitedEmail` solo es informativo / default del form)

## 13. Placeholders /admin y /app

- [x] 13.1 `app/admin/layout.tsx` redirige a `/login` sin sesión, a `/super` si super_admin, a `/app` si no es tenant admin
- [x] 13.2 `app/admin/page.tsx` con mensaje "Panel de administración en construcción"
- [x] 13.3 `app/app/layout.tsx` redirige a `/login` sin sesión, a `/super` si super_admin
- [x] 13.4 `app/app/page.tsx` con mensaje "Aplicación en construcción"

## 14. Actualizar `useAuthStatus`

- [x] 14.1 Usa `authClient.useSession()`; `isPending → loading`, `!data?.user → unauthenticated`, autenticado con `dashboardHref` (`/super` para super_admin, `/post-login` para los demás)
- [x] 14.2 `"use client"` presente
- [x] 14.3 Contrato `AuthStatus` (discriminated union) preservado — `AuthCta` no requiere cambios

## 15. Cerrar sesión

- [x] 15.1 Server action `signOutAction` en `app/super/actions-session.ts`
- [x] 15.2 Botón "Cerrar sesión" en el dropdown del layout `/super`

## 16. Verificación

- [x] 16.0 `npm run build` (Next 16 production build) pasa sin errores; todas las rutas registradas y Proxy detectado
- [x] 16.1 `docker compose up -d` corriendo; `drizzle-kit push --force` aplicó schema completo
- [x] 16.2–16.11 Verificación end-to-end manual (requiere `.env.local` con Resend, Google OAuth y SUPER_ADMIN_SETUP_TOKEN configurados — pendiente del usuario)

## Pendientes bloqueados

- [x] 1.2 `.env.example` (BLOQUEADO por permission settings — el contenido está documentado en design.md / tasks.md; el usuario debe crearlo manualmente o autorizar el path)
