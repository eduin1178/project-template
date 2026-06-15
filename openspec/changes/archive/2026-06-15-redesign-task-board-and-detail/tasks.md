## 1. Preparación de rutas y parámetros

- [x] 1.1 Revisar rutas actuales `next-app/app/[slug]/(member)/tasks/**` y `next-app/app/[slug]/admin/tasks/**` para separar responsabilidades entre listado base y detalle `[taskId]`.
- [x] 1.2 Definir parser server-side para `view=board|cards` con default `board` y preservación de searchParams existentes.
- [x] 1.3 Mantener redirects legacy de `?taskId=` a rutas `[taskId]`, preservando filtros y `view`.
- [x] 1.4 Asegurar que las rutas base ya no rendericen slot de detalle lateral.

## 2. Listado visual de tareas

- [x] 2.1 Crear o adaptar componentes de listado para modo `board` agrupado por `status`.
- [x] 2.2 Crear o adaptar componentes de listado para modo `cards` sin columnas.
- [x] 2.3 Implementar toggle visible entre `board` y `cards` que actualice URL sin perder filtros.
- [x] 2.4 Adaptar tarjetas para mostrar título, status, visibility cuando aplique, vencimiento, responsable, indicador de vencimiento y resumen de descripción.
- [x] 2.5 Implementar estados vacíos por columna en modo `board` y estado vacío general en modo `cards`.
- [x] 2.6 Asegurar navegación desde tarjeta hacia `[taskId]` preservando searchParams.

## 3. Filtros y autorización visual

- [x] 3.1 Mantener `FiltersTrigger`/panel unificado sin `aside` permanente.
- [x] 3.2 Exponer filtro de `visibility` en `/admin/tasks` y ocultarlo o fijarlo para viewers que solo pueden ver `active`.
- [x] 3.3 Confirmar que `/tasks` no renderiza `CreateTaskDialog`.
- [x] 3.4 Preservar conteo de filtros activos en el botón `Filtros`.
- [x] 3.5 Verificar que los filtros actualizan URL y refrescan el listado sin romper `view`.

## 4. Detalle full-page

- [x] 4.1 Reemplazar el uso de `TasksRouteShell` en rutas `[taskId]` por layout de detalle dedicado.
- [x] 4.2 Crear/adaptar componente de detalle full-page con header, metadatos, acciones por capabilities y composición responsive.
- [x] 4.3 Ubicar descripción, checklist y documentos en columna principal desktop.
- [x] 4.4 Ubicar comentarios como columna secundaria en desktop amplio.
- [x] 4.5 Adaptar mobile para flujo vertical: header, metadatos, descripción, checklist, documentos, comentarios.
- [x] 4.6 Mantener control `Volver al listado` en mobile y/o en header, preservando filtros y `view`.

## 5. Secciones del detalle

- [x] 5.1 Adaptar `TaskChecklistPanel` para renderizar como sección visible del detalle, sin depender de tabs.
- [x] 5.2 Adaptar `TaskDocumentsPanel` para renderizar como sección de `Documentos adjuntos`, sin depender de tab.
- [x] 5.3 Adaptar `TaskCommentsPanel` para funcionar como panel lateral desktop y sección vertical mobile.
- [x] 5.4 Mantener acciones de checklist, documentos y comentarios leyendo exclusivamente capabilities/flags proyectados.
- [x] 5.5 Revisar copy en español neutral y corregir textos mojibake existentes si aparecen en las superficies tocadas.

## 6. Responsividad y accesibilidad

- [x] 6.1 Validar clases responsive para tablero: columnas paralelas desktop, columnas apiladas mobile.
- [x] 6.2 Validar vista `cards`: grilla desktop, una columna mobile.
- [x] 6.3 Asegurar que acciones principales no dependan exclusivamente de hover en dispositivos táctiles.
- [x] 6.4 Revisar tamaños táctiles de filtros, toggle de vista, botones de tarjeta y acciones del detalle.
- [x] 6.5 Verificar orden visual y semántico del detalle para lectura móvil.

## 7. Verificación sin build

- [x] 7.1 Ejecutar verificación estática permitida del subproyecto si está disponible (por ejemplo lint/typecheck), sin ejecutar build.
- [x] 7.2 Probar manualmente rutas `/[slug]/tasks`, `/[slug]/tasks/[taskId]`, `/[slug]/admin/tasks` y `/[slug]/admin/tasks/[taskId]` en desktop y mobile.
- [x] 7.3 Verificar preservación de URL para filtros, `view`, navegación a detalle y volver al listado.
- [x] 7.4 Verificar que members regulares no reciben controles de visibility ni acciones no autorizadas.
- [x] 7.5 Verificar que admin/owner conserva filtros de visibility y acciones administrativas.

## Review Workload Forecast

- Estimated changed lines: 500-900
- 400-line budget risk: High
- Chained PRs recommended: Yes
- Suggested slices:
  - Slice 1: parser de `view`, listado board/cards y filtros.
  - Slice 2: detalle full-page y navegación `[taskId]`.
  - Slice 3: adaptación visual de checklist/documentos/comentarios y responsive polish.
- Decision needed before apply: Yes
