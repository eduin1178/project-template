<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes ? APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md ? next-app

Reglas técnicas para trabajar dentro de `next-app/`. Estas reglas complementan el `AGENTS.md` de la raíz y tienen prioridad para cambios en esta aplicación.

## Stack verificado

La aplicación usa:

- Next.js `16.2.6`
- React `19.2.4`
- TypeScript `5`
- Tailwind CSS `4`
- shadcn/ui manual sobre componentes en `components/ui/`
- Radix mediante paquete umbrella `radix-ui`
- Phosphor Icons mediante `@phosphor-icons/react`
- `react-hook-form`
- `zod`
- `next-themes`
- Nextjs 16 no usa middleware.ts en su lugar usa proxy.ts

## Verificación de Next.js

Cuando toques APIs de Next.js 16, verifica la documentaci?n local instalada en `node_modules/next/dist/docs/` antes de afirmar o implementar comportamiento.


## UI: shadcn-first

- Toda primitiva de UI disponible en shadcn debe consumirse desde `@/components/ui/*`.
- Prohibido crear componentes propios que dupliquen una primitiva de shadcn.
- Extender mediante composición sí; reimplementar no. 
- Si una primitiva nueva está en el registry configurado en `components.json`, agrégala con `npx shadcn@latest add <name>`. Usa el MCP de Shadcn si está disponible para obtener componentes que no estén instalados. Si no está instalado el MCP pide al usuario que lo instalte. 
- Si no existe en el registry y no se encuentra con el mcp, escríbela a mano siguiendo el estilo de las primitivas ya instaladas.
- Composiciones espec?ficas del dominio van en `components/landing/`, `components/<feature>/`, etc. NUNCA mezcladas con `components/ui/`.
- `components/ui/` es para primitivas reutilizables, no para l?gica de producto.

## Iconos

- Usa `@phosphor-icons/react`.
- No introduzcas `lucide-react` ni otro set de iconos sin justificaci?n y aprobaci?n.

## Radix

- No agregues paquetes `@radix-ui/react-*` individuales salvo decisión explícita.

## Clases CSS y Tailwind

- Usa `cn` desde `@/lib/utils` para composición de clases.
- Respeta tokens de tema definidos en `app/globals.css`.
- No metas valores mágicos si existe un token semántico (`background`, `foreground`, `primary`, etc.).
- Mantén compatibilidad con Tailwind CSS v4.
