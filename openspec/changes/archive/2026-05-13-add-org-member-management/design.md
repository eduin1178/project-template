## Context

`member` es la tabla generada por better-auth (organization plugin). El proyecto regenera ese schema con `npm run db:generate-auth-schema` (CLI oficial). No podemos editar `lib/db/schema/auth.ts` a mano: cualquier cambio se sobrescribiría en la próxima regeneración. El plugin `organization` acepta `schema.member.additionalFields` para extender la tabla de manera idiomática y persistente.

Los guards ya tienen un helper `loadMembershipsFor(userId)` y un `requireTenantAdminFor(organizationId)` (este último vive duplicado en `app/account/organizations/[id]/actions.ts`). Las páginas de admin del tenant ya están separadas de las de super, y el usuario ya confirmó: la gestión de miembros vive solo en el flujo del tenant (`/account/organizations/[id]/`), no en el panel super.

## Goals / Non-Goals

**Goals:**
- Que un admin/owner pueda cambiar el rol de cualquier miembro de su org entre `admin` y `member`.
- Que un admin/owner pueda suspender (o reactivar) el acceso de un miembro a su org sin perder el historial de membership.
- Que un miembro suspendido **no** pueda entrar a rutas de la org (revocación inmediata, request-by-request).
- Que la operación nunca rompa la garantía "toda org tiene al menos un admin/owner activo".
- Que el schema cambie de manera coherente con el flujo de generación de better-auth (regenerable, no editable a mano).

**Non-Goals:**
- Edición de rol/status desde el panel super. (Decisión del usuario: solo desde el panel del tenant.)
- Banear globalmente al usuario (`user.banned` ya existe para eso, lo maneja el super).
- Logout forzado de sesiones activas: el guard chequea status en cada request, así que la "revocación" es inmediata sin tocar la sesión.
- URL-based tenant routing (`/[org]/admin/...`). Sigue session-based.
- UI de "historial de cambios de status" o auditoría.

## Decisions

### Decisión 1 — Modelo: agregar `member.status` vía `additionalFields` (no una tabla separada)

**Elegido**: column `status text not null default 'active'` en `member`, declarado en `lib/auth/server.ts`:

```ts
organization({
  schema: {
    member: {
      additionalFields: {
        status: { type: "string", defaultValue: "active", input: false },
      },
    },
  },
})
```

`input: false` evita que llegue como input público desde los endpoints de better-auth (lo controlamos solo desde nuestras server actions).

**Alternativas consideradas**:
- Tabla `member_suspension(memberId, suspendedAt, suspendedBy, reason)` aparte. Da auditoría rica pero requiere join en cada guard y agrega complejidad sin pedido del usuario. Si después se necesita auditoría, se agrega encima sin migración disruptiva.
- Reusar `user.banned`. Rechazada porque es global (banea de toda la app), no por-org.

**Razón**: es la opción mínima que cumple el requisito y queda alineada con cómo better-auth modela extensiones de schema. Rebuild sin sorpresas.

### Decisión 2 — Revocación inmediata vía guard, no vía session invalidation

**Elegido**: cada request a rutas de tenant pasa por `loadActiveMembershipsFor` (que filtra `status='active'`). Si el usuario no tiene membership activa en la org activa de la sesión, redirect a `/account/suspended?org=<id>`.

**Alternativas**:
- Invalidar todas las sesiones del usuario al inactivarlo. Rechazada: lo desloguea de TODA la app (incluso de orgs donde sigue activo) y de `/account` (que no requiere membership).
- Marcar la sesión inválida solo para esa org. better-auth no expone esa granularidad.

**Razón**: el guard ya corre en cada request del layout; agregar el filtro `status='active'` cuesta una columna en la query existente. Sin sesiones rotas, sin estado adicional, comportamiento predecible.

### Decisión 3 — Regla "último admin/owner activo"

**Elegido**: antes de degradar/suspender, contar `SELECT count(*) FROM member WHERE org=X AND role IN ('admin','owner') AND status='active' AND id != target`. Si el resultado es 0 → rechazar.

**Razón**: previene el caso en que un admin se quede solo y al degradarse o suspender al otro admin la org quede sin nadie que pueda gestionarla. La verificación es una sola query barata; vive en el server action, no en la BD (no quiero un trigger que opaque la lógica).

### Decisión 4 — `requireTenantAdminFor` exige `status='active'`

**Elegido**: el guard de admin del tenant (en `app/account/organizations/[id]/actions.ts`) ahora exige `member.status = 'active'` además de `role IN ('admin','owner')`.

**Razón**: si un admin es suspendido por otro admin (caso raro pero válido), no debería poder seguir ejecutando acciones contra esa org en la ventana entre el toggle y el próximo refresh.

### Decisión 5 — Página de suspensión separada en `/account/suspended`

**Elegido**: ruta nueva, no un toast o un redirect a login.

**Alternativas**: redirect a `/login`, redirect a `/account` con flash message.

**Razón**: el usuario sigue autenticado y posiblemente activo en otras orgs. Necesita un mensaje claro y específico ("tu acceso a {org} fue suspendido"), no perder la sesión. La página da contexto y un botón para volver a `/account/organizations` donde verá las orgs en las que sigue activo.

### Decisión 6 — Listado de orgs en `/account/organizations` muestra suspendidas con badge, no las oculta

**Elegido**: badge `Suspendida` visible, link al detalle deshabilitado o redirige a `/account/suspended`.

**Razón**: ocultarlas confunde al usuario que sabe que estaba en X org y deja de verla. Mostrarla con estado claro evita el ticket de soporte.

## Risks / Trade-offs

- **[Riesgo] La regeneración de `auth.ts` borra ediciones manuales si alguien las hizo** → Mitigación: el cambio se hace **solo** vía `additionalFields`; el archivo `auth.ts` queda 100% generado. Documentar en tasks que el archivo no se edita a mano.
- **[Riesgo] `db:push` aplicado en dev pero olvidamos la migración SQL para producción** → Mitigación: en tasks incluir paso explícito `npm run db:generate` para producir el SQL versionado en `lib/db/migrations/`.
- **[Riesgo] Race: dos admins inactivan simultáneamente al otro último admin** → Mitigación: la query de "último activo" se hace dentro de la misma transacción que el UPDATE. Si hay race, uno de los dos UPDATE viola la regla y se rechaza al re-leer (en peor caso queda sin admins → admin del super interviene). Aceptable para v1.
- **[Riesgo] Miembro inactivado tiene una pestaña abierta con server action en vuelo** → Mitigación: el guard server-side rechazará la action por `requireTenantAdminFor` (si era admin) o por `status` chequeado en la action. Quien escribe miembro común no puede ejecutar actions admin; quien era admin pierde permiso al instante.
- **[Trade-off] No hay auditoría** → Aceptado para v1. Si después se necesita, se agrega tabla de auditoría sin tocar el modelo de status.

## Migration Plan

1. Editar `lib/auth/server.ts` agregando el `additionalFields.status` al plugin `organization`.
2. `npm run db:generate-auth-schema` → regenera `lib/db/schema/auth.ts` (incluirá `status text default 'active' not null`).
3. `npm run db:generate` → produce SQL versionado en `lib/db/migrations/`.
4. `npm run db:push` (dev) o `npm run db:migrate` (prod) → aplica.
5. Backfill: con default `'active'`, todas las filas existentes quedan activas. Sin script de backfill manual.
6. Deploy del código (guards, actions, UI). Sin downtime requerido — la columna existe antes que el código que la lee.

Rollback: revertir el merge + `ALTER TABLE member DROP COLUMN status`. Sin pérdida de datos (la columna era aditiva).
