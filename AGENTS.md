# AGENTS.md

Gu?a general para agentes que trabajen en este repositorio.

## Alcance del repositorio

Este repositorio es una plantilla de proyecto con dos ?reas principales:

- `next-app/`: aplicaci?n web de Docentix. Sus reglas t?cnicas, de estilo y codificaci?n viven en `next-app/AGENTS.md`.
- `openspec/`: especificaciones del producto y decisiones funcionales mediante Spec-Driven Development.

La ra?z debe mantenerse como capa de coordinaci?n general. NO pongas aqu? reglas espec?ficas de framework, UI, componentes, estilos o estructura interna de la app; esas pertenecen al `AGENTS.md` del subproyecto correspondiente.

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

- `/AGENTS.md`: reglas generales del repositorio, coordinaci?n y SDD.
- `/next-app/AGENTS.md`: reglas de Next.js, UI, codificaci?n, estructura interna, validaci?n, autenticaci?n y convenciones de producto de la aplicaci?n. Incluye la convenci?n de copy "Instituci?n vs `organization`": el copy visible al usuario final usa "Instituci?n"; los identificadores t?cnicos siguen siendo `organization`.
