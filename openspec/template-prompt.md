# Plantilla de prompt — Documentar un flujo en docs-app

Plantilla para pedirle a Claude Code que documente un flujo de usuario de
Docentix combinando lectura de specs/código, redacción en MDX y captura de
screenshots con Playwright MCP.

## Cómo usar esta plantilla

1. Copia el bloque "PROMPT" que está al final de este archivo.
2. Reemplaza todos los `{{placeholders}}` por valores concretos.
3. Pégalo en Claude Code con `next-app` corriendo en `http://localhost:3000`.
4. Revisa el resultado antes de aceptar el merge.

## Placeholders disponibles

| Placeholder | Qué poner |
|---|---|
| `{{flujo}}` | Frase corta del flujo. Ej: "Admin invita a un miembro a su institución". |
| `{{chunk}}` | Carpeta destino en `docs-app/content/docs/`. Ej: `invitaciones`, `auth`, `tareas`. Debe existir. |
| `{{slug-pagina}}` | Slug kebab-case del archivo MDX. Ej: `invitar-miembro`, `restablecer-contrasena`. |
| `{{rol}}` | Rol desde el que se ejecuta el flujo. Ej: `admin de institución`, `super_admin`, `docente`. |
| `{{email}}` | Email del usuario de prueba que Claude usará para loguearse. |
| `{{password}}` | Contraseña del usuario de prueba. **No comitees este archivo con credenciales reales.** |
| `{{slug-institucion}}` | Slug de la institución de prueba en la URL. Ej: `colegio-test`. |
| `{{datos-adicionales}}` | Datos puntuales que el flujo necesite. Ej: email a invitar, nombre de tarea, etc. Una línea por dato. |
| `{{rutas-codigo}}` | Rutas de código relevantes a leer en `next-app/`. Ej: `next-app/app/[slug]/admin/miembros/**`, `next-app/lib/auth/**`. |
| `{{specs-relevantes}}` | Archivos de spec relevantes en `openspec/specs/`. Ej: `openspec/specs/auth-status-contract/spec.md`. |

## Buenas prácticas antes de mandar el prompt

- Verifica que el usuario seed exista en la DB local y tenga el rol correcto.
- Verifica que la institución `{{slug-institucion}}` exista y que `{{email}}`
  sea miembro activo con el rol indicado.
- Si el flujo modifica estado (crea invitaciones, tareas, etc.), considerá
  usar datos descartables porque van a quedar en la DB local.
- Confirma que `next-app` está en `localhost:3000` y `docs-app` en
  `localhost:5000` antes de empezar.

## Lo que el prompt NO debe pedir

- Modificar `next-app`. Si Claude encuentra un bug, debe reportarlo aparte.
- Inventar pasos si la UI no existe — debe detenerse y preguntar.
- Declarar verificaciones como pasadas sin haberlas ejecutado en el browser.
- Capturar screenshots de información sensible real.

---

## PROMPT (copiar desde acá)

```
Documenta el flujo "{{flujo}}" en docs-app.

## Contexto operativo

- next-app está corriendo en http://localhost:3000
- docs-app está corriendo en http://localhost:5000
- Rol del actor: {{rol}}
- Credenciales del usuario de prueba: {{email}} / {{password}}
- Institución de prueba (slug en URL): {{slug-institucion}}
- Datos adicionales para el flujo:
  {{datos-adicionales}}

## Lectura previa obligatoria

Lee primero estos archivos para entender el flujo real (no inventes pasos):

- Specs:
  {{specs-relevantes}}
- Código de la app:
  {{rutas-codigo}}
- Convenciones:
  - docs-app/AGENTS.md (estructura de contenido, copy, sintaxis MDX)
  - next-app/AGENTS.md (vocabulario "Institución", rol super_admin, routing por slug)

Si encuentras una contradicción entre las specs y la UI real, detente y
reporta antes de documentar. No documentes lo que no existe.

## Salidas esperadas

1. Página MDX en `docs-app/content/docs/{{chunk}}/{{slug-pagina}}.mdx`:
   - Frontmatter con `title` y `description` en español neutral.
   - Pasos numerados, claros, en segunda persona singular ("tú").
   - Sin voseo. Usa "Institución" no "Organización".
   - Comentarios MDX con `{/* ... */}`, nunca `<!-- ... -->`.
   - Usa componentes Fumadocs cuando aporten: `<Callout>`, `<Steps>`,
     `<Cards>`, `<Tabs>`, etc.

2. Capturas en `docs-app/public/screenshots/{{chunk}}/`:
   - Usa Playwright MCP para navegar la app, loguearte con las
     credenciales de arriba y ejecutar el flujo paso a paso.
   - Toma una captura por momento clave (formulario vacío, formulario
     completado, estado de éxito, etc.).
   - IDs en kebab-case: `<estado-corto>.png`.
   - Referencialas en el MDX con ruta absoluta:
     `/screenshots/{{chunk}}/<id>.png`.

3. Manifest declarativo en `docs-automation/manifests/{{chunk}}.yaml`
   siguiendo el schema de `docs-automation/schemas/manifest.ts`:
   - Lista cada screenshot tomado (id, route, steps, clip).
   - Lista verificaciones de regresión para cada aserción importante
     del flujo (selector-exists, text-contains, url-matches).
   - Este manifest no se ejecuta hoy (capture.ts/verify.ts son stubs),
     pero deja registrado cómo reproducir todo más adelante.

4. Actualización de `docs-app/content/docs/{{chunk}}/meta.json`:
   - Agregá `{{slug-pagina}}` al array `pages` en el orden correcto.

## Restricciones

- No modifiques ningún archivo dentro de `next-app/`.
- No instales nuevas dependencias en `docs-app/` ni en `docs-automation/`.
- No declares un paso como "verificado" sin haberlo ejecutado en el browser.
- Si el flujo real difiere de lo que dicen las specs, detente y explícame
  la diferencia antes de documentar.
- Si necesitas datos que no te di (un ID, un nombre, una URL), preguntá
  antes de adivinar.

## Reporte final

Cuando termines:

1. Lista los archivos creados o modificados.
2. Lista las capturas tomadas con su ruta absoluta.
3. Decime si al abrir http://localhost:5000/docs/{{chunk}}/{{slug-pagina}}
   debería ver la doc renderizada con las imágenes.
4. Anota cualquier ambigüedad o gap que detectaste entre specs y código,
   para abrir un change separado si hace falta.
```
