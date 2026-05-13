## Context

El proyecto tiene autenticación operativa (better-auth con email/password + Google + verificación + reset), roles globales (`super_admin` / `admin` / `user`), plugin `organization` para tenancy, y una capa de super-admin completa con CRUD de organizaciones e invitaciones nativas. Lo que falta es la superficie del **usuario común y del admin de tenant** sobre su propia cuenta y sus organizaciones: hoy el menú del avatar solo cierra sesión y no hay rutas de cuenta.

Stack relevante: Next.js 16 (App Router, sin `middleware.ts` — proxy en `proxy.ts`), React 19, shadcn/ui sobre Radix umbrella, Drizzle + Postgres, server actions + cookies de sesión. El proyecto ya usa los plugins `admin` y `organization` de better-auth, que exponen client/server APIs para casi todo lo que esta change necesita.

Constraints:
- Spanish neutral mandatorio en todo string de UI.
- Sin sets de iconos fuera de `@phosphor-icons/react`.
- Primitivas siempre desde `@/components/ui/*`; shadcn-first.
- `super_admin` no debe tener registros en `member` (regla de [auth-roles](../../specs/auth-roles/spec.md)).

## Goals / Non-Goals

**Goals:**

- Centralizar la cuenta del usuario en un árbol `/account/*` compartido por los tres roles.
- Permitir gestión de perfil, contraseña y cuentas vinculadas sin emails de confirmación adicionales (set/change directo desde sesión vigente).
- Que el admin de tenant pueda editar `name` y `logo` de su organización e invitar miembros, sin pasar por super_admin.
- Que cualquier usuario vea sus invitaciones pendientes filtrando por email, reutilizando el flujo público de aceptación existente.
- Integrar Cloudflare R2 como capa de storage genérica, no acoplada a logos.
- Unificar `signOutAction` en un único módulo.

**Non-Goals:**

- No se cambia la regla de aceptación de invitaciones (sigue siendo `invitationId` la única autoridad; no se valida match de email en aceptación).
- No se agrega 2FA, sesiones múltiples ni gestión de dispositivos.
- No se permite editar `slug` de organización.
- No se introduce un sistema general de archivos privados/firmados; R2 se usa para assets públicos (logos).
- No se permite a `super_admin` editar logos desde su panel en esta change (queda como follow-up; el header solo lo muestra read-only).
- No se permite que un admin de tenant elimine la organización ni cambie su propio rol.

## Decisions

### Rutas compartidas `/account/*` en vez de duplicar por panel

`/account/profile`, `/account/organizations`, `/account/organizations/[id]`, `/account/invitations`.

**Por qué:** evita triplicar páginas por rol. La variación por rol vive en el contenido (qué orgs ve, qué acciones puede ejecutar), no en la ruta. El layout `/account/*` usa un shell minimalista con un header propio y el `NavUser` consistente, sin sidebar de panel.

**Alternativa descartada:** `/super/profile`, `/admin/profile`, `/app/profile`. Mantiene el sidebar contextual pero triplica código y crea inconsistencias cuando un usuario tiene múltiples roles.

**Implicación:** desde cualquier panel (`/super`, `/admin`, `/app`), los items del menú del avatar enlazan a rutas absolutas `/account/*`. Al salir de `/account` el usuario regresa al panel correspondiente mediante un "← Volver al panel" calculado por `deriveDashboardHref`.

### NavUser unificado y orientado por rol

El componente [components/layout/nav-user.tsx](../../../next-app/components/layout/nav-user.tsx) recibe `role: "super_admin" | "admin" | "user"` y construye los items vía `getUserMenuItems(role)` en un módulo nuevo `lib/auth/role-menu.ts`. El rol "admin" se calcula en el server desde memberships (al menos uno con `role === "admin"`).

| Item | super_admin | admin | user |
|------|-------------|-------|------|
| Mi perfil | ✓ | ✓ | ✓ |
| Mis organizaciones | — | ✓ | ✓ |
| Invitaciones | ✓ | ✓ | ✓ |
| Cerrar sesión | ✓ | ✓ | ✓ |

Las invitaciones se muestran a `super_admin` porque puede recibir invitaciones de super_admin pending (no en orgs); la regla es estricta: filtra por su email, no por su rol.

### Cuentas vinculadas: usar `listAccounts` + `linkSocial` + `unlinkAccount` de better-auth

La API client de better-auth expone `authClient.listAccounts()`, `authClient.linkSocial({ provider, callbackURL })`, `authClient.unlinkAccount({ providerId, accountId })`. No necesitamos tocar la tabla `account` directamente.

**Guardrail anti-lockout (server-side):** la action `unlinkGoogle` invoca `auth.api.listAccounts({ headers })`, valida que la cuenta tendrá al menos un método de acceso restante (otro social o `account.password !== null`), y solo entonces invoca `auth.api.unlinkAccount`. Si quedaría sin método, lanza error.

**Set password para OAuth-only:** se detecta server-side leyendo la tabla `account` y verificando si existe una fila con `providerId === "credential"` y `password !== null`. Si no, el componente muestra el form de "establecer contraseña" en lugar del de "cambiar".

### Cambio de contraseña sin email de confirmación

`authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })`. Revocar otras sesiones es el comportamiento más seguro y es el default razonable.

**Alternativa descartada:** flujo con email de confirmación. Decisión del usuario.

### Storage en Cloudflare R2 vía SDK S3

Módulo `lib/storage/r2.ts` que exporta:
- `r2Client()`: `S3Client` configurado con `endpoint: https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, region `auto`, credenciales desde env.
- `uploadPublicAsset({ key, body, contentType }): Promise<{ url: string }>`: `PutObjectCommand` con `ACL: "public-read"` no aplica en R2 — la publicidad se controla por configuración del bucket. La URL final es `${R2_PUBLIC_BASE_URL}/${key}`.
- `deletePublicAsset({ key })`: `DeleteObjectCommand`.

**Convención de keys:** `org-logos/${organizationId}/${randomUUID()}.${ext}`. Al reemplazar logo se borra el anterior (best-effort, no transaccional con la BD; si falla el delete se loggea pero no rompe el update).

**Validaciones del upload (server action):**
- MIME ∈ `{image/png, image/jpeg, image/webp, image/svg+xml}`.
- Tamaño ≤ 1 MB.
- Reescribir `contentType` antes de subir.

**No usar presigned URLs** en esta change: el upload pasa por server action que recibe `FormData` con el archivo, lo valida, y lo envía a R2. Más simple y suficiente para logos pequeños.

### Campo `logo` en `organization`

El plugin `organization` de better-auth incluye `logo: text` en la tabla por defecto. Verificar en el schema actual (`lib/db/schema/auth.ts`) durante apply. Si no está, agregarlo vía migración Drizzle. No es breaking porque hoy no se usa.

### Filtro de invitaciones por email del usuario

Query Drizzle directa sobre `invitation`:

```
SELECT i.*, o.name AS organizationName, o.logo
FROM invitation i
JOIN organization o ON o.id = i.organizationId
WHERE LOWER(i.email) = LOWER(?session.user.email?)
  AND i.status = 'pending'
  AND i.expiresAt > NOW()
ORDER BY i.createdAt DESC;
```

`LOWER()` en ambos lados porque better-auth normaliza emails a lower al persistir, pero el comparado se hace defensivo. La aceptación sigue intacta en `/accept-invitation?invitationId=...`.

### Detalle de organización por admin: reuso de tabs

El componente del detalle es **compartido con super_admin** (`OrgDetailTabs`) y recibe `mode: "super" | "admin" | "member"`. Las acciones (`canEdit`, `canInvite`, `canRevoke`) se derivan del mode.

**Alternativa descartada:** dos páginas separadas. Genera duplicación inevitable de la lógica de tabs/listados.

### sign-out unificado

Eliminar `app/super/actions-session.ts`. Migrar los imports de `app/super/(protected)/layout.tsx` a `@/lib/auth/actions`. El layout pasa la misma referencia al `NavUser`.

## Risks / Trade-offs

- **R2 misconfigurado → logos rotos.** → Mitigación: validar en startup si `R2_*` están definidas; si falta alguna, fallar fast en la action de upload con error explícito ("R2 no está configurado"). Logos previos no se rompen porque el bucket es estable.
- **Upload de archivo en server action vs presigned URL.** → Bloquea el event loop con archivos grandes. Mitigación: límite de 1 MB. Si en el futuro crece a uploads de cursos/videos, migrar a presigned PUT.
- **`unlinkAccount` race condition.** → Dos requests paralelos podrían pasar el guardrail y desvincular ambos. Mitigación: aceptable como bug menor (cliente único); si se vuelve real, mover el check a una transacción con `SELECT ... FOR UPDATE`.
- **`super_admin` viendo "Invitaciones" cuando no aplica.** → Mostrar empty state amable en vez de ocultar. Más consistente y evita lógica condicional en el menú.
- **Admin de múltiples orgs.** → La UX de "Mis organizaciones" debe escalar a N. Listado tabular simple, sin paginación todavía (volúmenes esperados bajos en esta fase).
- **Edición concurrente del logo.** → Si dos admins suben logos al mismo tiempo, el último escribe gana y el primer archivo huérfano queda en R2. Aceptable; un job de limpieza puede agregarse después.
- **PR grande.** → 3 specs nuevos + 2 modificados + integración storage. Forecast >400 LOC. Apply se hará en sub-PRs encadenados según [chained-pr](.atl/skill-registry) — pero las specs viven juntas en este change.

## Migration Plan

1. **Migración de schema (si aplica):** agregar `logo` a `organization` si no viene del plugin. Drizzle generate + push.
2. **Env vars en `.env.local` y `.env.example`:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`.
3. **Dependencia:** `npm i @aws-sdk/client-s3`.
4. **Apply en sub-PRs:**
   - PR1: `account-shell` + `account-profile` (incluye consolidación de sign-out y `/app/layout.tsx`).
   - PR2: `account-invitations`.
   - PR3: `r2-storage` + `account-organizations` (incluye delta `super-organizations` y `super-org-invitations`).
5. **Rollback:** revertir PRs en orden inverso. Los datos persistidos (logos en R2, columna `logo`) son aditivos y no rompen al rollback de UI.

## Open Questions

- ¿El bucket de R2 será compartido para todos los assets públicos del producto o uno por dominio (`edunet-logos`, `edunet-avatars`)? Asumimos uno solo (`R2_BUCKET=docentix`) y prefijos por carpeta. Si se quiere segmentar, se hace después sin cambiar el contrato del módulo.
- ¿Logo del usuario (`user.image`) se mueve también a R2 o se deja al proveedor (Google) / URL externa por ahora? Esta change deja `user.image` como string editable (URL); upload a R2 queda como follow-up.
