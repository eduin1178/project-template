# AGENTS.md

Gu?a general para agentes que trabajen en este repositorio.

## Alcance del repositorio

Este repositorio contiene varios subproyectos independientes (no es un monorepo
pnpm con workspace raíz; cada subproyecto tiene su propio `package.json` y se
instala por separado):

- `next-app/`: aplicación web de Docentix. Reglas técnicas en `next-app/AGENTS.md`.
- `docs-app/`: sitio público de documentación con Fumadocs. Reglas en `docs-app/AGENTS.md`.
- `docs-automation/`: scripts locales (Playwright) para capturar y verificar
  documentación. Reglas en `docs-automation/AGENTS.md`.
- `openspec/`: especificaciones del producto y decisiones funcionales mediante
  Spec-Driven Development.

Los subproyectos son totalmente independientes: no comparten paquetes ni se
importan entre sí. La raíz se mantiene como capa de coordinación general y
documentación SDD. NO pongas aquí reglas específicas de framework, UI,
componentes, estilos o estructura interna de la app; esas pertenecen al
`AGENTS.md` del subproyecto correspondiente.

## Reglas globales

- Nunca agregues `Co-Authored-By` ni atribuci?n de IA en commits.
- Usa conventional commits si el usuario pide preparar commits.
- Nunca ejecutes build despu?s de cambios.
- No aceptes afirmaciones t?cnicas sin verificar en c?digo, specs o documentaci?n local.
- Si necesitas preguntar algo, pregunta y detente hasta recibir respuesta.
- Prop?n alternativas con tradeoffs cuando haya m?s de una soluci?n razonable.
- Responde en el mismo idioma que use el usuario.

## Spec-Driven Development

Antes de modificar comportamiento de producto, revisa las specs relevantes en `openspec/specs/`. Las specs son el plano arquitect?nico; el c?digo es la construcci?n.

Specs actuales:

- `openspec/specs/auth-status-contract/spec.md`
- `openspec/specs/landing-page/spec.md`
- `openspec/specs/ui-foundation/spec.md`

Si un cambio contradice una spec, NO lo implementes silenciosamente. Explica la contradicci?n y propone una de estas rutas:

1. actualizar la spec, o
2. adaptar la implementaci?n para cumplirla.

## Flujo de trabajo esperado

1. Verifica el estado del repo y lee los archivos relevantes antes de editar.
2. Si trabajas dentro de un subproyecto, lee primero su `AGENTS.md` local.
3. Mant?n los cambios peque?os, coherentes y alineados con las specs.
4. No imprimas secretos ni contenido sensible de archivos `.env*`.
5. No declares que una verificaci?n pas? si no la ejecutaste.

## Responsabilidad de archivos AGENTS.md

- `/AGENTS.md`: reglas generales del repositorio, coordinación y SDD.
- `/next-app/AGENTS.md`: reglas de Next.js, UI, codificación, estructura
  interna, validación, autenticación y convenciones de producto de la
  aplicación. Incluye la convención de copy "Institución vs `organization`":
  el copy visible al usuario final usa "Institución"; los identificadores
  técnicos siguen siendo `organization`.
- `/docs-app/AGENTS.md`: reglas del sitio público de documentación (Fumadocs).
  Stack, convenciones de copy en español neutral, estructura por chunks,
  prohibición de imports cruzados con `next-app/`.
- `/docs-automation/AGENTS.md`: reglas del workspace de automatización local
  con Playwright. Schema del manifest YAML, convenciones de naming de
  screenshots, restricción local-only.
