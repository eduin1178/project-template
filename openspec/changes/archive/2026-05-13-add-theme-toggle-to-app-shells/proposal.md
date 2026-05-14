## Why

Hoy el `ThemeToggle` solo existe en el navbar de la landing (`components/landing/navbar.tsx`). Una vez que el usuario se autentica y entra a un shell con sidebar (`/admin`, `/app`, `/super/*`, `/account`), no tiene forma de cambiar entre claro/oscuro. La preferencia ya se persiste vía `next-themes` (el `ThemeProvider` está montado a nivel root), pero falta el control accesible en cada shell.

## What Changes

- Mover `components/landing/theme-toggle.tsx` → `components/layout/theme-toggle.tsx`. El componente deja de ser exclusivo de landing y pasa a ser una primitiva del shell.
- Actualizar el import en `components/landing/navbar.tsx` a la nueva ruta.
- Montar `<ThemeToggle />` en el extremo derecho del header de los cuatro shells autenticados:
  - `app/admin/layout.tsx`
  - `app/app/layout.tsx`
  - `app/super/(protected)/layout.tsx`
  - `app/account/layout.tsx` (este no tiene Sidebar, pero tiene su propio header — debería tener toggle igual)
- Patrón: un wrapper `ml-auto` justo antes del cierre del `<header>` para empujar el toggle al extremo derecho.

## Capabilities

### New Capabilities
<!-- Ninguna. -->

### Modified Capabilities
<!-- Ninguna. No hay specs sobre el shell autenticado. -->

## Impact

- **Código afectado**: 6 archivos
  - Mover: `components/landing/theme-toggle.tsx` → `components/layout/theme-toggle.tsx`
  - Editar: `components/landing/navbar.tsx` (import path)
  - Editar: `app/admin/layout.tsx`, `app/app/layout.tsx`, `app/super/(protected)/layout.tsx`, `app/account/layout.tsx`
- **Sin schema, sin API, sin dependencias nuevas** (`next-themes` ya está instalado y `ThemeProvider` ya está montado).
- **Sin breaking changes**.
