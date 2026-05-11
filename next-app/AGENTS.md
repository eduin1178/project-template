<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## UI: shadcn-first (no duplicar primitivas)

- Toda primitiva de UI (Button, Input, Textarea, Select, Card, Dialog, Sheet, Accordion, Label, Badge, Separator, etc.) DEBE consumirse desde `@/components/ui/*`, instaladas mediante el registry configurado en `components.json` (estilo `radix-maia`).
- Prohibido crear componentes propios que dupliquen una primitiva de shadcn — extender (composición) sí; reimplementar no.
- Iconos: `@phosphor-icons/react` (NO lucide). Si necesitás un ícono nuevo, importalo desde phosphor.
- Radix: usar el paquete umbrella `radix-ui` (`import { Dialog as DialogPrimitive } from "radix-ui"`), no `@radix-ui/react-*` individuales.
- Si una primitiva nueva no está en el registry, agregala con `npx shadcn@latest add <name>`. Si no existe en el registry, escribila a mano siguiendo el estilo de las primitivas ya instaladas.
- Composiciones específicas del dominio van en `components/landing/`, `components/<feature>/`, etc. — NUNCA mezcladas con `components/ui/`.

## Contenido y copy

- Todo el texto visible de la landing y otras páginas marketing/estáticas vive en `content/<feature>/*.ts` como objetos tipados — NO hardcoded en JSX. Esto facilita iteración de copy y futura i18n.

## Autenticación

- Estado de autenticación se consume vía el hook `useAuthStatus()` en `@/lib/auth/use-auth-status.ts`. En v1 retorna siempre `unauthenticated`. Cuando exista la spec de auth, ese hook se conecta a la fuente real sin tocar consumidores.

