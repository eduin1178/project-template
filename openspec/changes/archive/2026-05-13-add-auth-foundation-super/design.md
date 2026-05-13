## Context

Esta es la primera fase de autenticación real del producto. Partimos de un Next.js 16.2.6 (App Router, React 19, Tailwind 4) con UI de landing y un stub `useAuthStatus()` que siempre devuelve `unauthenticated`. No hay base de datos, no hay sesiones, no hay roles.

El producto es educativo y multi-tenant (instituciones). Internamente hay un equipo de plataforma (desarrolladores y soporte) que necesita acceso transversal vía `/super`. Las instituciones tienen rectores/coordinadores (admin) y docentes (user).

Restricciones técnicas confirmadas en explore:
- Next 16 reemplaza `middleware.ts` por `proxy.ts`. La documentación oficial advierte: *"un matcher que excluye un path también salta server functions ahí; verifica auth en cada server function en vez de depender de Proxy solo"*.
- Better-auth ofrece plugins `admin` (rol global) y `organization` (membership con rol por tenant). Encajan exactamente con el modelo.
- Postgres + Drizzle es la dirección elegida; el schema lo genera el CLI de better-auth.

## Goals / Non-Goals

**Goals:**
- Autenticación real funcional (email/pass + Google) para los tres roles, con verificación de email y recuperación de contraseña estándar.
- Modelo de roles claro: `super_admin` global, `admin` y `user` ligados a una `organization`.
- Bootstrap seguro del primer super_admin sin race conditions.
- Invitación de super_admin a super_admin con aceptación por email/pass o Google.
- Protección de `/super` resistente a manipulación de cookies, refactors de rutas, o saltos de proxy.
- Schema y migraciones de BD versionados y reproducibles.
- Contrato `useAuthStatus` mantenido y enriquecido sin romper consumidores existentes.

**Non-Goals:**
- UI funcional de `/admin` y `/app` (solo placeholders y redirects).
- CRUD de organizaciones/tenants desde `/super`.
- Invitaciones a `admin` o `user` de un tenant.
- 2FA, passkeys, magic link, SSO empresarial.
- Auditoría avanzada, rate limiting fino, geo-blocking, dispositivos confiables.
- Política de contraseñas custom (se usa la default de better-auth).

## Decisions

### D1. Modelo de roles: `admin` plugin + `organization` plugin combinados

**Decisión.** Usar `better-auth/plugins/admin` para gestionar el rol global del usuario (`user.role` ∈ `{super_admin, admin, user}`) y `better-auth/plugins/organization` para gestionar membership y rol dentro de tenants (`member.role` ∈ `{admin, member}` por organización).

**Por qué.**
- `super_admin` es global y NO pertenece a ninguna organización → vive en `user.role`.
- `admin` y `user` (docente) son específicos de un tenant → viven en `member.role` dentro de la `organization` correspondiente.
- Separar "platform role" de "tenant role" evita acoplar permisos transversales al modelo de orgs y permite que un usuario pueda, eventualmente, pertenecer a varias orgs con roles distintos sin colisionar con su rol global.

**Alternativas consideradas.**
- Schema custom sin plugins → más control pero reinventa lo que better-auth ya ofrece probado. Rechazado.
- Una "organization especial" llamada `platform` para super_admins → unifica el modelo pero introduce un caso especial confuso. Rechazado.
- Database-per-tenant → aislamiento fuerte, operacionalmente brutal para una plataforma educativa multi-institución. Rechazado.

**Mapping de roles a UI.**
| `user.role` | `member.role` (en org activa) | Redirect post-login | Layout/nav |
|---|---|---|---|
| `super_admin` | — (irrelevante) | `/super` | Layout de plataforma |
| `user` | `admin` | `/admin` | Layout de admin de tenant |
| `user` | `member` | `/app` | Layout de usuario |

Nota: el rol global por defecto en el `admin` plugin es `user`. Los miembros normales de una org tienen `user.role = "user"` y `member.role ∈ {admin, member}`. Solo los super_admin tienen `user.role = "super_admin"`.

### D2. Login único en `/login` con redirect derivado

**Decisión.** Una sola ruta `/login` para los tres roles. Post-auth, una server action calcula el `dashboardHref` y redirige.

**Cómo se calcula `dashboardHref`.**
```
if user.role === "super_admin" → "/super"
else if active member.role === "admin" → "/admin"
else → "/app"
```

La "active organization" para un usuario no super se resuelve con la primera membership (en esta fase un usuario solo pertenecerá a una organización; el modelo soporta más, pero la UX de selector de org queda para fase futura).

**Por qué.** Una sola entrada simplifica branding, recuperación de contraseña, signups (cuando aplique), y enlaces de email. El rol se descubre tras autenticar, no antes.

### D3. Bootstrap del primer super_admin: token + transacción

**Decisión.** Endpoint `POST /api/super/setup` (server action o route handler) protegido por dos condiciones combinadas:
1. `count(user where role='super_admin') === 0`
2. Header/body con `setupToken === process.env.SUPER_ADMIN_SETUP_TOKEN`

La operación corre dentro de una transacción Drizzle con `SELECT ... FOR UPDATE` sobre la tabla `user` (o lock advisory) para evitar la race condition. La página `/super/setup` solo se renderiza si la condición 1 se cumple; de lo contrario devuelve `notFound()`.

**Por qué token + count en vez de solo count.**
- Solo count → si la URL se filtra antes del setup (logs, screenshots, scrapers), un atacante puede ganar la carrera. En producción es inaceptable.
- Solo token → suficiente seguridad, pero no auto-cierra: el endpoint quedaría latente. Si el token se filtra después, se podrían crear más super_admins por esta ruta (en vez de por invitación).
- Combinado → "doble freno": el setup solo es posible en una ventana real (sin super_admins) Y solo por quien tiene el token.

**Por qué transacción + lock.** Aunque la ventana de race sea pequeña (un solo deployment, primer usuario), un lock es trivial de implementar y elimina el bug por construcción.

**Rotación del token.** Una vez creado el primer super, el endpoint devuelve 404 sin mirar el token. El operador debe rotar/eliminar la variable del entorno como buena práctica, pero la seguridad ya no depende de ello.

### D4. Invitaciones de super_admin: token-as-truth

**Decisión.** Una `superInvitation` table propia (no el invitation del organization plugin, que está acoplado a orgs):

```
superInvitation {
  id: uuid
  token: text unique  -- generado con randomBytes(32)
  invitedEmail: text  -- informativo, NO se valida contra el email de aceptación
  invitedBy: text (fk user.id)
  expiresAt: timestamp  -- 7 días
  acceptedAt: timestamp nullable
  acceptedBy: text (fk user.id) nullable
}
```

**Flujo de aceptación.**
1. Usuario llega a `/accept-invitation?token=...`
2. Server valida: token existe, no expirado, no aceptado.
3. Renderiza formulario de signup pre-llenado con `invitedEmail` (editable o no — editable, ya que el token es la verdad).
4. Usuario completa signup (email/pass o Google).
5. Server action única atómica: crea/asocia el `user`, lo marca `role = "super_admin"`, marca la invitación como aceptada. Todo en una transacción.

**Por qué no valida coincidencia de email.** Decisión explícita del usuario. El token es de un solo uso y expira; quien lo tiene es el invitado legítimo. Permitir que use un email distinto al sugerido facilita casos reales (cuenta personal vs corporativa, cambio de proveedor).

**Por qué no usar `organization.invitation`.** Ese plugin liga la invitación a una `organizationId` (NOT NULL en su schema). Hackearla con una org dummy para super_admins viola el modelo. Una tabla propia es más limpia y de pocas líneas.

### D5. Defense in depth: proxy + layout RSC + server actions

**Decisión.** Tres capas, cada una con su rol:

```
┌─ proxy.ts ──────────────────┐
│ Responsabilidad: UX         │
│ - Si no hay cookie de       │
│   session en /super* → 302  │
│   a /login                  │
│ - NO toca la BD             │
│ - NO es la fuente de        │
│   verdad de autorización    │
└─────────────────────────────┘
              ↓
┌─ app/super/layout.tsx (RSC) ┐
│ Responsabilidad: gating UI  │
│ - auth.api.getSession()     │
│ - Si !session O             │
│   role !== super_admin →    │
│   notFound() (404, no 403)  │
│ - Es la verdad para render  │
└─────────────────────────────┘
              ↓
┌─ cada server action ─────────┐
│ Responsabilidad: autoridad   │
│ - auth.api.getSession()      │
│ - Re-verifica rol            │
│ - Lanza si no autorizado     │
│ - Es la verdad para mutar    │
└──────────────────────────────┘
```

**Por qué `notFound()` y no `redirect("/login")` en el layout.** Para `/super` queremos negar la existencia de la ruta a quien no es super_admin. Un 404 no filtra información sobre la existencia del panel. (En `/admin` y `/app` el redirect a `/login` sí es apropiado porque son rutas públicamente conocidas).

**Por qué triple verificación.** Lo dice la docs de Next 16: *"Server Functions son POST a la ruta donde se usan, así que un matcher de Proxy que excluye un path también salta server functions en ese path. Verifica auth dentro de cada Server Function en vez de depender de Proxy solo."* Confiar en proxy o layout para autorizar mutaciones es un bug latente.

### D6. Schema de BD: CLI generate + commit

**Decisión.** Usar `npx @better-auth/cli generate --config lib/auth/server.ts --output lib/db/schema/auth.ts`. Commitear el resultado. Crear `lib/db/schema/index.ts` que re-exporta el schema generado y añade tablas propias (`superInvitation`).

**Migraciones.** `drizzle-kit push` en dev (rápido, no genera SQL). `drizzle-kit generate` + `drizzle-kit migrate` para producción (SQL versionado en `lib/db/migrations/`).

**Por qué CLI.** Better-auth evoluciona; el CLI garantiza que el schema queda alineado con la versión instalada. Escribirlo a mano introduce divergencias silenciosas.

### D7. Postgres dev: Docker Compose intercambiable

**Decisión.** `docker-compose.yml` en raíz con un servicio `postgres:16-alpine`, volumen nombrado, expuesto en `localhost:5432`. La app lee `DATABASE_URL`. En producción, cambiar la variable apunta a Neon/Supabase/Railway sin tocar código.

```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: edunet
      POSTGRES_PASSWORD: edunet_dev
      POSTGRES_DB: edunet
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
volumes: { pgdata: {} }
```

`.env.example` documenta todas las variables.

### D8. Contrato `useAuthStatus`: evolución sin ruptura

**Decisión.** Mantener la firma `() => AuthStatus` y la directiva `"use client"`. La union sigue siendo:

```ts
type AuthStatus =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; dashboardHref: string };
```

Internamente el hook ahora envuelve `authClient.useSession()` de better-auth:
- `isPending` → `{ status: 'loading' }`
- `!data?.user` → `{ status: 'unauthenticated' }`
- `data?.user` → `{ status: 'authenticated', dashboardHref: deriveDashboardHref(data) }`

`deriveDashboardHref` se exporta también desde `lib/auth/` para uso server-side (login server action).

**Por qué.** Los consumidores actuales (`AuthCta` en la landing) no requieren cambios. El spec previo (`auth-status-contract`) sigue cumpliéndose; solo cambia la implementación interna y la fuente de `dashboardHref`. El delta de spec captura esto explícitamente.

### D9. Google OAuth + email de invitación: desacoplados

**Decisión.** Google OAuth se configura una sola vez en el server de better-auth (`socialProviders.google`). Está disponible para cualquier flujo. La invitación NO valida el email retornado por Google contra `invitedEmail`. El token de la invitación es el único gate.

**Por qué.** Decisión explícita del usuario. Simplifica el flujo y respeta casos reales (correo personal vs corporativo).

### D10. Idioma y UI: shadcn + español neutral

**Decisión.** Toda la UI con shadcn/ui (instalada via `npx shadcn@latest add ...`, recursos resueltos vía el MCP de shadcn). Toda copy en español neutral con segunda persona `tú` (Ingresa, Selecciona, Cuéntanos, etc.). Nada de voseo.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| Token de setup filtrado por logs/screenshots durante el primer deploy | Combinado con `count(super_admin) === 0`; ventana de exposición real es la del primer setup. Documentar rotación de la variable post-bootstrap |
| Race condition al crear el primer super_admin | Transacción Drizzle con `SELECT ... FOR UPDATE` sobre `user`. Constraint adicional opcional: índice único parcial `WHERE role='super_admin'` solo durante setup (lo dropeamos después si se quiere permitir más supers) — descartado: no se aplicará constraint, basta el lock |
| Drift entre schema generado por better-auth CLI y código de aplicación al actualizar versión | Regenerar y revisar diff como parte del upgrade. Documentar el comando en `lib/db/schema/README.md` |
| Olvidar verificar auth en una server action nueva | Crear helper `requireSuperAdmin()` que todas las actions de `/super` deben llamar al inicio. ESLint rule custom queda fuera de scope; convención + code review |
| `/super/setup` queda accesible por error en producción aún con super existente | Doble check: la página devuelve `notFound()` y el endpoint POST también. Test cubre ambos |
| Cookie de sesión robada da acceso completo al panel | Aceptado como riesgo estándar. Sesiones better-auth con `httpOnly`, `secure` en prod, `sameSite=lax`. Mitigación futura: 2FA (fuera de scope) |
| Postgres local en Docker no replica comportamientos de proveedores cloud (RLS, extensions específicas) | Aceptado en esta fase. Cuando se introduzca RLS o features específicas, replicar en docker-compose con la misma imagen del proveedor |
| Proxy.ts ejecuta para CADA request (incluso assets) si no se afina el matcher | Matcher explícito que excluye `_next/static`, `_next/image`, archivos estáticos. Incluir solo `/super/:path*`, `/admin/:path*`, `/app/:path*`, `/login` |

## Migration Plan

Esta change es aditiva en su mayoría; el único punto de migración interna es `useAuthStatus`.

1. **Setup local.** `docker compose up -d`, `npm i`, copiar `.env.example` → `.env.local`, llenar variables.
2. **Generar schema.** `npm run db:generate-auth-schema` (wrapper del CLI de better-auth).
3. **Push schema a Postgres.** `npm run db:push`.
4. **Levantar app.** `npm run dev`.
5. **Bootstrap.** Visitar `/super/setup` con el token. Crear primer super.
6. **Verificar.** Login en `/login`, redirect a `/super`.

**Rollback (en dev).** `docker compose down -v` borra todo. En producción esta change no tiene rollback simple porque introduce dependencias nuevas; si hay que revertir, revertir los commits y redeployar. La BD nueva se puede dropear; no hay datos pre-existentes que migrar.

## Open Questions

- ¿Proveedor SMTP para emails (verificación, recuperación, invitación)? Resend, SendGrid, Postmark, AWS SES — afecta env vars y la integración del adapter. Decidirlo en tasks o en una mini-decisión antes de apply. Default sugerido: Resend (DX simple, free tier).
- ¿`organization.create` queda disponible vía API pero sin UI en esta fase? Sí — el plugin la expone; no construimos UI hasta la fase de tenants. El primer super_admin podrá crear orgs por API/script si lo necesita en dev.
- ¿Política de expiración de sesión? Default better-auth (7 días) salvo que se indique lo contrario.
- ¿`/super/setup` debe pedir también verificación de email para el primer super? Default: sí, para mantener consistencia con el resto del producto. Confirmable en apply.
