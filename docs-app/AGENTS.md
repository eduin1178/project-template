# AGENTS.md — docs-app

Reglas técnicas para trabajar dentro de `docs-app/`. Estas reglas complementan
el `AGENTS.md` de la raíz y tienen prioridad para cambios en esta aplicación.

## Stack verificado

- Next.js `16.2.6`
- React `19.2.x`
- TypeScript `6.x`
- Tailwind CSS `4`
- Fumadocs (`fumadocs-ui` + `fumadocs-mdx` + `fumadocs-core`) `16.x`
- Iconos: `lucide-react` (NO `@phosphor-icons/react` — `docs-app` y `next-app`
  no comparten librería de iconos)
- Features AI presentes pero dormidas: `@ai-sdk/react`, `ai`,
  `@openrouter/ai-sdk-provider`, `flexsearch`. Se conservan instaladas para
  reactivación futura. No expongas estas features en la navegación principal
  sin una decisión explícita de hosting (requieren runtime server).

## Separación con next-app — REGLA INVIOLABLE

`docs-app/` y `next-app/` son aplicaciones **completamente independientes**.

- Prohibido importar nada desde `next-app/` (relativo o por alias).
- Prohibido importar nada de `docs-app/` desde `next-app/`.
- No existe paquete compartido de UI ni de tokens. Si necesitas un valor de
  marca (color, radio), cópialo literalmente desde `next-app/app/globals.css`
  y documenta el origen con un comentario.
- Cada app es dueña total de su Tailwind, sus tokens, sus deps y sus versiones.

Razón: evitar conflictos de versiones (Tailwind, Next, React) y permitir que
cada app evolucione en su propio ciclo de release.

## Build

- `pnpm dev` para servir en local.
- `pnpm build` para producción. **No** usa `output: 'export'` — la app es
  Next.js estándar; la mayoría de páginas son estáticas, las rutas AI quedan
  server-side pero no expuestas.
- La decisión de hosting está pendiente. Para deploy estático puro hay que
  remover las rutas server (features AI) y agregar `output: 'export'`.

## Copy en español neutral

- Idioma: `lang="es"` en el layout raíz.
- Segunda persona singular `tú` (Ingresa, Selecciona, Elige, Define, Haz,
  Cierra, Cuéntanos, quieres, necesitas). **Prohibido** voseo (Ingresá,
  Seleccioná, Hacé, querés, sos, etc.) y otros regionalismos.
- Vocabulario: usa **"Institución"** en texto visible al usuario final,
  nunca "Organización" (es la misma convención que `next-app`).
- Aplica a: páginas MDX, `meta.json`, layout, metadata, copy de UI custom.

## Estructura de contenido

El contenido vive bajo `content/docs/` organizado por chunks lógicos:

```
content/docs/
├── index.mdx              ← bienvenida
├── auth/
│   ├── meta.json          ← título y orden
│   └── *.mdx              ← páginas del chunk
├── onboarding/
├── super/                 ← documentación de plataforma (rol super_admin)
├── invitaciones/
├── organizaciones/        ← gestión de instituciones (carpeta mantiene el
│                            término técnico; el copy interno dice "Institución")
├── tareas/
└── permisos/
```

### Agregar una página

1. Crea el archivo `content/docs/<chunk>/<slug>.mdx`.
2. Agrega frontmatter:
   ```yaml
   ---
   title: Título de la página
   description: Una línea breve para SEO y previews.
   ---
   ```
3. Agrega el slug al array `pages` de `meta.json` del chunk, en el orden
   deseado.

### Sintaxis MDX — comentarios

MDX **no** acepta comentarios HTML (`<!-- ... -->`). Si los usas, el build de
Fumadocs falla con `Unexpected character "!" before name`.

Usa siempre la sintaxis JSX:

```mdx
{/* Comentario válido en MDX */}
```

### `meta.json` por chunk

```json
{
  "title": "Nombre visible del chunk",
  "pages": ["slug-1", "slug-2"]
}
```

`pages: []` indica chunk vacío (válido durante setup).

## Tematizado

- Preset base: `fumadocs-ui/css/neutral.css`.
- Overrides locales en `app/global.css` para `--color-fd-primary` y derivados.
- Los valores se copian de `next-app/app/globals.css` (variables
  `--primary`, `--primary-foreground`, `--ring`).
- No importes archivos CSS de `next-app/`.

## Workflow

1. Lee el chunk objetivo y su `meta.json`.
2. Escribe MDX en español neutral, usando los componentes Fumadocs
   (`<Cards>`, `<Card>`, `<Callout>`, `<Tabs>`, etc.).
3. Si una página referencia un screenshot, el screenshot debe declararse en
   el manifest del chunk en `docs-automation/manifests/<chunk>.yaml`.
4. No declares verificaciones pasadas sin haberlas ejecutado.
