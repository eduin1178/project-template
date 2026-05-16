# Design — introduce-platform-organization

## Decisión 1: ¿Org plataforma como org real o como abstracción virtual?

**Opciones consideradas**:

| Opción | Detalle | Pros | Contras |
|--------|---------|------|---------|
| A. Org real con slug fijo `docentix` | Una fila más en `organization`, no diferenciada por flag | Cero código especial. Dogfooding genuino. El equipo opera Docentix como un tenant más. | Aparece en `loadActiveOrganizationsFor()` del super y en cualquier listado donde se enumeren orgs. |
| B. Org virtual con flag `isPlatform` | Fila aparte, oculta en listados de tenants, filtrada de UIs de gestión | Aísla el espacio del staff del producto comercial. | Requiere flag en schema, filtros en cada query, lógica de "qué orgs son tenants". Burocracia. |
| C. Sin org, super sigue sin membresía pero con relaciones especiales | El super se vincula a recursos via `user.role` y permisos globales | Cero datos extra. | Es exactamente el modelo actual; no resuelve nada. |

**Elegida**: **A — org real con slug `docentix`**.

**Por qué**: el costo de aislamiento (que la org plataforma aparezca en listados del super) se compensa con copy claro ("Plataforma Docentix") y con un ítem permanente "Panel de plataforma" en el sidebar. Es el patrón Vercel/GitHub/Linear: la organización del fabricante es una fila más en la tabla de organizaciones; el staff usa esa org para todo trabajo interno (templates, demos, dogfooding). Cualquier filtrado especial introduciría asimetrías que se filtran al producto.

**Consecuencias**:
- Listados del super (ej. `/super/organizations`) verán la org plataforma. Si más adelante se quiere ocultarla del listado de tenants, se hace con un filtro `WHERE slug != 'docentix'` documentado, no con un flag en schema.
- El super puede crear tasks reales en la org plataforma. Es deseable: sirve como playground.

## Decisión 2: ¿Slug fijo o configurable?

**Opciones**: hardcoded `"docentix"` vs. env var `PLATFORM_ORG_SLUG`.

**Elegida**: **hardcoded en `lib/auth/platform-org.ts`** como constante exportada.

**Por qué**:
- El slug aparece en redirects, en seed, en validaciones. Tener una env var multiplica los puntos de configuración.
- Si el branding cambia algún día, una migración explícita renombra el slug. No es algo que cambie por entorno.
- Mantener constante simplifica testing.

**Consecuencias**:
- Si en algún momento se necesita correr múltiples productos sobre el mismo código, el slug pasa a env. Para Docentix, no aplica.

## Decisión 3: ¿Cómo asegurar que todo super tiene membresía? Trigger en DB, seed manual, o helper en código

**Opciones**:

| Opción | Pros | Contras |
|--------|------|---------|
| A. Trigger SQL `AFTER INSERT ON user WHERE role='super_admin'` | Atómico con la creación del super. Imposible olvidarlo. | Lógica oculta del lado DB. Difícil de testear y de migrar a otra DB. |
| B. Hook en código en cada punto de creación de super | Lógica explícita en la app. | Cualquier path nuevo que cree un super requiere recordar el hook (riesgo de olvido). |
| C. Helper `ensurePlatformMembership(userId)` idempotente, llamado por todos los flujos + defensa en profundidad en `redirectToDashboard()` | Lógica en código, retry-seguro, fallback si algún flujo se olvida. | Requiere disciplina de llamarlo. |

**Elegida**: **C — helper idempotente + defensa en profundidad**.

**Por qué**:
- Es la opción más estándar en Next + Drizzle. Mantenemos lógica en TypeScript donde es testeable.
- La defensa en profundidad evita que un nuevo flujo de creación de super (ej. un endpoint admin futuro) deje al usuario sin membresía. Si pasa, `redirectToDashboard()` detecta "super sin membresía" y llama a `ensurePlatformMembership` antes de redirigir.
- Idempotencia se garantiza con `INSERT ... ON CONFLICT DO NOTHING` sobre `(organizationId, userId)`. La tabla `member` ya tiene índices que permiten esa cláusula.

**Consecuencias**:
- El helper vive en `lib/auth/platform-org.ts`.
- Tests del helper validan re-entrada sin errores.
- El bug "super sin membresía" pasa a ser auto-recuperable.

## Decisión 4: ¿Reset de migraciones ahora o nunca?

**Opciones**:

- A. Acumular una migración nueva `00XX_seed_platform_organization.sql` sin tocar las anteriores.
- B. Reset total: borrar todas las migraciones, regenerar `0000_init.sql` como snapshot, agregar `0001_seed_platform.sql`.

**Elegida**: **B — reset total**.

**Por qué**:
- No hay producción. El usuario lo confirmó explícitamente.
- Las migraciones acumuladas hasta ahora son ~20 archivos de evolución incremental que tras el cambio de modelo de roles dejan de ser legibles como historia coherente.
- Cualquier dev que clone el repo puede booteаr una DB limpia con `0000_init` en segundos.
- Es **ahora o nunca**: una vez la app está en producción, el reset deja de ser viable.

**Consecuencias**:
- Todas las DBs de dev del equipo se invalidan. Se documenta en commit message y en `next-app/AGENTS.md`.
- Si hay scripts de seed de dev (factories, fixtures), siguen funcionando contra el schema nuevo (porque el snapshot es del schema actual).
- Si en el futuro el equipo quiere recuperar histórico de migraciones, queda en git (commit anterior al reset).

## Decisión 5: ¿Org plataforma visible en `loadActiveOrganizationsFor`?

**Opciones**:

- A. Visible. El team-switcher del super muestra "Docentix" como una org más.
- B. Filtrada explícitamente cuando el viewer es super.

**Elegida**: **A — visible**.

**Por qué**:
- Coherencia: cualquier consumidor de `loadActiveOrganizationsFor(superId)` ve todas las orgs donde el super es member. Tratar a la org plataforma especial introduce excepciones que se filtran al producto.
- UI explícita: el team-switcher es donde el super alterna entre "trabajar en la plataforma Docentix" y "trabajar en una institución cliente". Ocultarla rompe el modelo mental.
- Si un super tiene membresía en orgs cliente (raro, pero posible), el switcher las muestra junto con Docentix. Eso es lo deseado.

**Consecuencias**:
- El listado del `/super/organizations` (gestión de tenants) sí filtra la org plataforma para evitar confusión visual. Se hace con `WHERE slug != PLATFORM_ORG_SLUG`.

## Decisión 6: ¿Qué hacer con la migración legacy de superadmins existentes?

Hipótesis: en el ambiente actual hay ≥1 super_admin que NO tiene membresía. Tras el reset de migraciones la DB se rehidrata desde cero, pero los datos de cuentas reales necesitan seed.

**Plan**:
- Después de aplicar `0000_init`, ejecutar `pnpm run db:seed-platform` (script nuevo).
- El script:
  1. Crea la org plataforma (`getOrCreatePlatformOrg`).
  2. Recorre `user` filtrando `role = "super_admin"` y para cada uno ejecuta `ensurePlatformMembership(user.id)`.
  3. Setea `user.lastActiveOrganizationId = platformOrgId` para esos usuarios.
- Esto deja a todos los supers existentes alineados al modelo nuevo. Como la DB es de dev, basta correrlo una vez.

## Decisión 7: ¿Cómo evitar regresión del bug "super sin org" si alguien borra la membresía manualmente?

Aceptamos el riesgo. Mitigación: la defensa en profundidad de `redirectToDashboard()` detecta `super_admin && activeOrgRole === null` y llama a `ensurePlatformMembership(user.id)` antes de redirigir. El segundo intento debería resolver. Si igual falla, redirige a `/super` con el código actual.

## Resumen de invariantes que este change establece

- **INV-1**: Toda fila en `user` con `role = "super_admin"` tiene al menos una fila en `member` con `role = "owner"`, `status = "active"` y `organizationId = <orgPlataforma.id>`.
- **INV-2**: Existe exactamente una fila en `organization` con `slug = "docentix"` (la org plataforma).
- **INV-3**: `redirectToDashboard()` nunca decide en base a `user.role` global excepto como defensa en profundidad si `activeOrgRole === null`.
- **INV-4**: `/super` solo se accede con `user.role === "super_admin"`; no por defecto desde login.

Estos invariantes son los que el change 3 va a asumir como pre-condition.
