## Why

El usuario reportó un desfase visual en el header del layout `super`: el seam entre el `Sidebar` y el `SidebarInset` muestra un pequeño escalón a la altura del borde inferior del header. Investigando, el `SidebarHeader` mide ~72px de alto (`p-2` = 16px vertical + `SidebarMenuButton size="lg"` con `h-14` = 56px) mientras que el `<header>` del `SidebarInset` mide solo `h-14` = 56px. La diferencia de 16px hace que la base del sidebar header quede por debajo del border-b del inset header, generando un "step" en el seam — visible en los tres layouts (admin, app, super), pero más perceptible en super por el ícono `ShieldStar` que dirige el ojo a esa zona.

## What Changes

- Subir el alto del `<header>` del `SidebarInset` de `h-14` (56px) a `h-16` (64px) en los tres layouts (`admin`, `app`, `super/(protected)`). Es el alto que usa el block oficial `sidebar-07` de shadcn y reduce el desfase de 16px a 8px (residual aceptado por la convención shadcn).
- Subir el `<Separator orientation="vertical">` interno de `h-4` (16px) a `h-6` (24px) para que quede mejor proporcionado dentro del header más alto y se note más como divisor.
- **No** cambia funcionalidad, no cambia schema, no afecta APIs.
- **Fuera de alcance**: extraer el shell común de los tres layouts en un componente compartido (queda para cuando se agreguen el `ThemeToggle` y el `TeamSwitcher`, que naturalmente provocarán esa refactor).

## Capabilities

### New Capabilities
<!-- Ninguna. Es un ajuste visual. -->

### Modified Capabilities
<!-- Ninguna. No hay specs activos para los layouts admin/app/super con requisitos sobre el alto del header. -->

## Impact

- **Código afectado**: 3 archivos
  - `next-app/app/admin/layout.tsx`
  - `next-app/app/app/layout.tsx`
  - `next-app/app/super/(protected)/layout.tsx`
- **Sin cambios de comportamiento**: solo CSS.
- **Sin cambios de schema, API, ni dependencias**.
- **Verificación**: visual en los tres routes (`/admin`, `/app`, `/super/organizations`) — el border-b del inset header debe alinearse con el final del SidebarHeader (residual ≤ 8px aceptable por convención shadcn).
