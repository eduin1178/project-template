## 1. Aplicar fix en los tres layouts

- [x] 1.1 `next-app/app/admin/layout.tsx`: cambiar `h-14` → `h-16` en el `<header>` del `SidebarInset`, y `h-4` → `h-6` en el `<Separator orientation="vertical">`.
- [x] 1.2 `next-app/app/app/layout.tsx`: mismo cambio (`h-14` → `h-16`, `h-4` → `h-6`).
- [x] 1.3 `next-app/app/super/(protected)/layout.tsx`: mismo cambio (`h-14` → `h-16`, `h-4` → `h-6`).

## 2. Verificación

- [x] 2.1 `npx tsc --noEmit`: **0 errores**.
- [x] 2.2 Visual smoke en `/super/organizations`, `/admin`, `/app`: el border-b del header del inset debe alinearse con la base del SidebarHeader (residual ≤ 8px). El Separator vertical entre el `SidebarTrigger` y el label debe verse proporcionado dentro del header. **Pendiente — el usuario lo verifica visualmente**.

## Review Workload Forecast

- Líneas cambiadas estimadas: ~6 (2 por archivo × 3 archivos).
- 400-line budget risk: **Low**.
- Chained PRs: **No**.
