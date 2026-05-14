## 1. Mover componente

- [x] 1.1 Crear `next-app/components/layout/theme-toggle.tsx` con el contenido de `components/landing/theme-toggle.tsx`.
- [x] 1.2 Borrar `next-app/components/landing/theme-toggle.tsx`.
- [x] 1.3 Actualizar el import en `next-app/components/landing/navbar.tsx`: `from "./theme-toggle"` → `from "@/components/layout/theme-toggle"`.

## 2. Montar en los shells autenticados

- [x] 2.1 `app/admin/layout.tsx`: importar `ThemeToggle` y agregarlo dentro del `<header>` con wrapper `<div className="ml-auto flex items-center">` para empujarlo a la derecha.
- [x] 2.2 `app/app/layout.tsx`: idem.
- [x] 2.3 `app/super/(protected)/layout.tsx`: idem.
- [x] 2.4 `app/account/layout.tsx`: idem (header sin sidebar, mismo patrón `ml-auto`).

## 3. Verificación

- [x] 3.1 `npx tsc --noEmit`: **0 errores**.
- [ ] 3.2 Visual: en los cuatro routes (`/admin`, `/app`, `/super/organizations`, `/account/profile`) debe aparecer el toggle a la derecha; click alterna `light` ↔ `dark` y persiste tras navegar/recargar. **Pendiente — el usuario lo verifica visualmente**.
- [ ] 3.3 Confirmar que la landing sigue mostrando el toggle (regresión). **Pendiente — el usuario lo verifica visualmente**.

## Review Workload Forecast

- Líneas estimadas: ~25 (5 imports + 4 montajes + el move).
- 400-line budget risk: **Low**.
- Chained PRs: **No**.
