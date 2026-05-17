## ADDED Requirements

### Requirement: Sección "Captura del producto en acción"

La landing page SHALL incluir una sección dedicada a mostrar el producto en uso, ubicada entre la sección "Para quién es" y la sección "Beneficios". La sección SHALL presentar al menos tres capturas reales del producto, cada una con su título corto, descripción de una o dos líneas y `alt` descriptivo, cubriendo como mínimo: dashboard de cumplimiento de la institución, vista de una tarea con checklist + comentarios + documentos adjuntos, y vista mobile del docente.

#### Scenario: Renderizado de la sección
- **WHEN** el visitante hace scroll y llega a la sección "Captura del producto en acción"
- **THEN** se muestran al menos tres bloques con captura + texto explicativo en el orden definido

#### Scenario: Captura optimizada
- **WHEN** el navegador solicita cualquiera de las capturas de la sección
- **THEN** la imagen se sirve con `next/image` en formato moderno (AVIF/WebP cuando esté soportado), con `placeholder="blur"` y dimensiones explícitas que evitan layout shift

#### Scenario: Variante dark
- **WHEN** el tema activo del sitio es `dark`
- **THEN** cada captura usa su variante `*-dark` correspondiente

### Requirement: Catálogo de características refleja funcionalidad real

La sección "Características" SHALL listar únicamente capacidades que el producto entrega hoy, e incluir como mínimo: Tareas con criterios claros, Plazos visibles, Roles y permisos, Notificaciones por correo, Reportes y métricas (dashboard de cumplimiento), Comentarios en contexto, Checklist por tarea, Documentos adjuntos por tarea, Workspace multi-institución por slug y Onboarding guiado. La sección SHALL NO listar capacidades inexistentes hoy (integraciones con Google Workspace o Microsoft 365, notificaciones in-app/push, calendarios externos, categorías/etiquetas si no están implementadas).

#### Scenario: Verificación del listado
- **WHEN** se inspecciona la sección "Características"
- **THEN** cada característica listada corresponde a una capacidad implementada en el producto

#### Scenario: Ausencia de capacidades futuras
- **WHEN** se busca dentro de "Características" referencias a integraciones, push, calendarios externos o categorías
- **THEN** no aparecen como característica entregada

### Requirement: Sección "Roadmap" reemplaza a "Integraciones"

La landing page SHALL incluir una sección llamada "Roadmap" (o equivalente que comunique futuro) en lugar de la sección anterior "Integraciones". Cada elemento de la sección SHALL llevar un indicador visual explícito con el texto "Próximamente" (badge o etiqueta). La sección SHALL incluir como mínimo: Google Workspace, Microsoft 365, Calendarios externos y Notificaciones in-app y push.

#### Scenario: Badge "Próximamente" presente
- **WHEN** el visitante ve cualquier item de la sección Roadmap
- **THEN** el item muestra un indicador visual con el texto "Próximamente"

#### Scenario: No hay sección "Integraciones" autónoma
- **WHEN** se inspecciona el DOM de la página renderizada
- **THEN** no existe una sección titulada "Integraciones" que presente esas capacidades como entregadas

### Requirement: Copy en español neutral con "tú" y vocabulario "Institución"

Todo el copy visible de la landing SHALL usar segunda persona singular "tú" con conjugaciones estándar y SHALL NO contener voseo ("Ingresá", "podés", "querés", "intentá", "andá", "dale", etc.) ni regionalismos marcados. Todo texto visible al usuario SHALL usar las formas "Institución" / "institución" / "Instituciones" / "instituciones" en lugar de "Organización" / "organización" / "Organizaciones" / "organizaciones".

#### Scenario: Sin voseo en copy publicado
- **WHEN** se inspecciona cualquier string visible al usuario en la landing
- **THEN** no contiene formas voseantes

#### Scenario: Vocabulario "Institución"
- **WHEN** se busca el lema "Organización" u "Organizaciones" en texto visible al usuario
- **THEN** no aparece; las referencias correspondientes usan "Institución" / "Instituciones"

### Requirement: Sistema visual con tema claro y oscuro coherente

La landing page SHALL soportar tema claro y oscuro a través de `next-themes`, con paleta, tipografía y escalas tokenizadas en `app/globals.css` y respetadas por todas las secciones, sin valores de color o tamaño "mágicos" hardcoded fuera del sistema de tokens.

#### Scenario: Cambio de tema
- **WHEN** el usuario cambia entre tema claro y oscuro
- **THEN** todas las secciones de la landing (incluyendo capturas) se adaptan al tema activo sin elementos con contraste roto

#### Scenario: Sin colores mágicos
- **WHEN** se inspeccionan los componentes de `components/landing/*`
- **THEN** los colores aplicados provienen de tokens del tema (clases `bg-background`, `text-foreground`, `bg-primary`, etc.) o de utilities derivadas, no de valores hex inline

## MODIFIED Requirements

### Requirement: Secciones de marketing en orden definido

Después del Hero, la landing page SHALL renderizar las siguientes secciones en este orden: Dolores → Cómo funciona → Características → Para quién es → Captura del producto en acción → Beneficios → Seguridad y privacidad → Roadmap → Prueba social → Planes → FAQ → CTA final → Footer.

#### Scenario: Orden de secciones
- **WHEN** se inspecciona el DOM de la página renderizada
- **THEN** las secciones aparecen en el orden definido sin omisiones

#### Scenario: Sección "Cómo funciona"
- **WHEN** el usuario ve la sección "Cómo funciona"
- **THEN** la sección presenta entre 3 y 4 pasos numerados que describen el flujo: definir tareas → asignar a docentes con plazos → seguimiento → entrega/cierre

#### Scenario: Sección "Para quién es"
- **WHEN** el usuario ve la sección "Para quién es"
- **THEN** la sección presenta tres tarjetas diferenciadas: Rector, Coordinador y Docente, cada una con su propuesta de valor específica

#### Scenario: Sección "Características"
- **WHEN** el usuario ve la sección "Características"
- **THEN** la sección presenta un grid de al menos 6 características con icono, título y descripción breve, todas correspondientes a capacidades reales del producto

#### Scenario: Sección "Captura del producto en acción"
- **WHEN** el usuario ve la sección "Captura del producto en acción"
- **THEN** la sección aparece entre "Para quién es" y "Beneficios" y presenta capturas reales del producto

#### Scenario: Sección "Roadmap"
- **WHEN** el usuario ve la sección "Roadmap"
- **THEN** la sección aparece entre "Seguridad y privacidad" y "Prueba social" y cada elemento lleva indicador "Próximamente"

#### Scenario: Sección FAQ
- **WHEN** el usuario ve la sección FAQ
- **THEN** la sección presenta al menos 5 preguntas frecuentes en formato acordeón (componente Accordion de shadcn), expandibles individualmente por click o teclado

### Requirement: Sección Hero con promesa, descripción y CTA

La landing page SHALL incluir como primera sección después de la navbar un Hero compuesto por: titular con la promesa principal, subtítulo descriptivo breve, CTA primario "Solicitar demo", CTA secundario opcional ("Conocer más" anclado a la siguiente sección) e imagen ilustrativa del producto (captura real preferida sobre ilustración abstracta). La imagen del Hero SHALL tener variantes para tema claro y oscuro.

#### Scenario: Click en CTA primario del hero
- **WHEN** el usuario hace click en el CTA "Solicitar demo" del hero
- **THEN** se abre el formulario de solicitud de demo (Dialog o Sheet de shadcn)

#### Scenario: Imagen del hero optimizada
- **WHEN** el navegador solicita la imagen del hero
- **THEN** se sirve mediante `next/image` con formato moderno (AVIF/WebP cuando esté soportado), placeholder blur y dimensiones explícitas que evitan layout shift

#### Scenario: Variante dark del hero
- **WHEN** el tema activo del sitio es `dark`
- **THEN** la imagen del hero usa su variante `*-dark` correspondiente
