## Context

El `SidebarHeader` de shadcn renderiza con `p-2` (padding 8px arriba/abajo = 16px vertical) más el contenido — en este proyecto, un `SidebarMenuButton` con `size="lg"` que tiene `h-14` (56px). Total: **72px**. El `<header>` del `SidebarInset` que la app define en cada layout estaba en `h-14` (56px). Esa diferencia de 16px hace que el border-b del inset header quede 16px por encima del final del SidebarHeader, dejando visible un fragmento de la columna del sidebar entre los dos border-b. El usuario lo percibió como un "desfase" en el header de super, pero el defecto está en los tres layouts.

## Goals / Non-Goals

**Goals:**
- Que el seam entre `Sidebar` y `SidebarInset` se vea continuo (sin escalón de 16px en el border-b).
- Mantener consistencia entre los tres layouts (`admin`, `app`, `super/(protected)`).

**Non-Goals:**
- Refactor para extraer el shell común (queda para el change que agregue `ThemeToggle` o `TeamSwitcher`).
- Cambiar el `size` del brand button del sidebar (alteraría densidad visual general).
- Eliminar el residual de 8px restante (es la convención del block oficial `sidebar-07` de shadcn; aceptado).

## Decisions

### Decisión 1 — Subir el inset header a `h-16` en vez de `h-[72px]`

**Elegido**: `h-16` (64px). Reduce el desfase de 16px → 8px.

**Alternativas**:
- `h-[72px]` arbitrario para alinear pixel-perfect.
- Cambiar el `size` del SidebarMenuButton de `lg` a `default` para reducir el alto del SidebarHeader a ~56px y mantener el inset en `h-14`.

**Razón**: `h-16` es el valor que usa el block oficial `sidebar-07` de shadcn (referencia canónica). Aceptamos el residual de 8px como convención del sistema de diseño en vez de introducir un valor arbitrario que después haya que justificar. Bajar el `size="lg"` cambiaría la densidad visual del brand en el sidebar, que es deliberadamente prominente.

### Decisión 2 — Subir el `<Separator>` de `h-4` a `h-6`

**Elegido**: `h-6` (24px) — proporcionalmente queda igual de balanceado dentro del nuevo `h-16` que el `h-4` lo estaba en `h-14`.

**Razón**: si subimos el header pero dejamos el separador en `h-4`, queda visualmente perdido (más aire arriba/abajo). Mantener proporción es lo que el ojo espera.

## Risks / Trade-offs

- **[Riesgo] Alguna página tiene un sticky/sub-header que asume `h-14`** → Mitigación: grep por `h-14` en `app/**` para descartar dependencias. Si hay (poco probable), ajustarlas en la misma PR.
- **[Trade-off] Quedan 8px residuales** → Aceptado como convención del block oficial de shadcn. Si después se ve mal, fix de seguimiento con `h-[72px]`.
