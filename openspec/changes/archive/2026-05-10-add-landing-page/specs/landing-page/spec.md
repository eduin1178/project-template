## ADDED Requirements

### Requirement: Ruta pública `/` con landing page estática

El sistema SHALL servir una página pública en la ruta `/` renderizada como React Server Component sin requerir autenticación. La página SHALL ser estática (sin data fetching dinámico) excepto los segmentos explícitamente marcados como cliente (botón de acceso al dashboard y formulario de solicitud de demo).

#### Scenario: Visitante anónimo accede a la raíz
- **WHEN** un visitante no autenticado navega a `/`
- **THEN** el servidor responde con la landing page completa renderizada en HTML sin redirigir y sin requerir cookies de sesión

#### Scenario: Carga rápida en conexión móvil
- **WHEN** un visitante carga `/` en una conexión simulada 4G estándar
- **THEN** el Largest Contentful Paint (LCP) reportado por Lighthouse SHALL ser menor a 2.5 segundos

### Requirement: Diseño responsivo mobile-first

La landing page SHALL renderizarse correctamente en viewports desde 320px hasta 1920px de ancho, con jerarquía visual y CTAs visibles sin scroll horizontal en ningún breakpoint.

#### Scenario: Viewport móvil pequeño (320px)
- **WHEN** la página se visualiza en un viewport de 320px de ancho
- **THEN** ningún elemento desborda horizontalmente y el CTA principal del hero es visible sin hacer scroll lateral

#### Scenario: Viewport desktop ancho (1440px)
- **WHEN** la página se visualiza en un viewport de 1440px de ancho
- **THEN** el contenido se distribuye con un contenedor centrado de ancho máximo legible (no se estira a todo el ancho)

### Requirement: Accesibilidad WCAG AA

La landing page SHALL cumplir los criterios de WCAG 2.1 nivel AA en estructura semántica, contraste, navegación por teclado y etiquetado de elementos interactivos.

#### Scenario: Navegación por teclado
- **WHEN** un usuario navega la página usando únicamente la tecla Tab
- **THEN** todos los elementos interactivos (links, botones, campos de formulario) reciben foco en orden lógico y muestran un indicador visible de foco

#### Scenario: Contraste de texto
- **WHEN** se mide el contraste de cualquier texto contra su fondo
- **THEN** la relación de contraste SHALL ser al menos 4.5:1 para texto normal y 3:1 para texto grande (≥18pt o ≥14pt bold)

#### Scenario: Imágenes con texto alternativo
- **WHEN** la página contiene imágenes informativas (hero, prueba social, iconos no decorativos)
- **THEN** cada imagen SHALL tener un atributo `alt` descriptivo; las imágenes puramente decorativas SHALL tener `alt=""`

### Requirement: Navbar sticky con identidad y CTAs

La landing page SHALL incluir una barra de navegación fija en la parte superior visible durante todo el scroll, con el logo de Docentix a la izquierda y dos CTAs a la derecha: acceso (Login/Dashboard) y Solicitar demo.

#### Scenario: Persistencia al hacer scroll
- **WHEN** el usuario hace scroll hacia abajo en la página
- **THEN** la navbar permanece fija en la parte superior del viewport sin desaparecer

#### Scenario: Navbar en móvil
- **WHEN** la página se visualiza en un viewport menor a 768px
- **THEN** la navbar muestra el logo y ambos CTAs (Login y Solicitar demo) visibles sin colapsarlos en hamburguesa

### Requirement: CTA de acceso reactivo al estado de autenticación

El botón de acceso de la navbar SHALL reflejar el estado de autenticación del usuario expuesto por `useAuthStatus()`: mostrar "Iniciar sesión" cuando el estado es `unauthenticated`, "Ir al Dashboard" cuando es `authenticated`, y un placeholder no interactivo cuando es `loading`.

#### Scenario: Usuario no autenticado
- **WHEN** `useAuthStatus()` retorna `{ status: 'unauthenticated' }`
- **THEN** el botón muestra "Iniciar sesión" y enlaza a la ruta de login

#### Scenario: Usuario autenticado
- **WHEN** `useAuthStatus()` retorna `{ status: 'authenticated', dashboardHref: '/dashboard' }`
- **THEN** el botón muestra "Ir al Dashboard" y enlaza al `dashboardHref` provisto

#### Scenario: Estado de carga
- **WHEN** `useAuthStatus()` retorna `{ status: 'loading' }`
- **THEN** el botón muestra un placeholder visual (skeleton o spinner) y no es interactivo

### Requirement: Sección Hero con promesa, descripción y CTA

La landing page SHALL incluir como primera sección después de la navbar un Hero compuesto por: titular con la promesa principal, subtítulo descriptivo breve, CTA primario "Solicitar demo", CTA secundario opcional ("Conocer más" anclado a la siguiente sección) e imagen ilustrativa de fondo o lateral.

#### Scenario: Click en CTA primario del hero
- **WHEN** el usuario hace click en el CTA "Solicitar demo" del hero
- **THEN** se abre el formulario de solicitud de demo (Dialog o Sheet de shadcn)

#### Scenario: Imagen del hero optimizada
- **WHEN** el navegador solicita la imagen del hero
- **THEN** se sirve mediante `next/image` con formato moderno (AVIF/WebP cuando esté soportado), placeholder blur y dimensiones explícitas que evitan layout shift

### Requirement: Secciones de marketing en orden definido

Después del Hero, la landing page SHALL renderizar las siguientes secciones en este orden: Dolores → Cómo funciona → Características → Para quién es → Beneficios → Integraciones → Seguridad y privacidad → Prueba social → Planes → FAQ → CTA final → Footer.

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
- **THEN** la sección presenta un grid de al menos 6 características con icono, título y descripción breve

#### Scenario: Sección FAQ
- **WHEN** el usuario ve la sección FAQ
- **THEN** la sección presenta al menos 5 preguntas frecuentes en formato acordeón (componente Accordion de shadcn), expandibles individualmente por click o teclado

### Requirement: Formulario "Solicitar demo"

El botón "Solicitar demo" (en navbar, hero y CTA final) SHALL abrir un formulario que capture: nombre completo, email institucional, nombre de la institución, **departamento** (lista desplegable con los departamentos de Colombia), **municipio** (texto libre), rol del solicitante (Rector / Coordinador / Otro), cantidad aproximada de docentes y mensaje opcional. Los campos departamento y municipio SHALL renderizarse en una fila de dos columnas de 50% de ancho cada una, ubicada inmediatamente debajo del nombre de la institución. El formulario SHALL validar los campos en cliente con `zod` antes de enviar.

#### Scenario: Layout de departamento y municipio
- **WHEN** el usuario visualiza el formulario en cualquier viewport
- **THEN** los campos "Departamento" y "Municipio" aparecen en una fila de dos columnas de igual ancho, ubicada justo debajo del campo "Institución"

#### Scenario: Departamento sin seleccionar
- **WHEN** el usuario intenta enviar sin seleccionar un departamento
- **THEN** el formulario muestra el mensaje de validación correspondiente y no envía la solicitud

#### Scenario: Envío exitoso del formulario
- **WHEN** el usuario completa todos los campos requeridos con valores válidos y hace click en "Enviar solicitud"
- **THEN** el formulario envía un `POST` a `/api/demo-request` con el payload, recibe `200 OK` y muestra un mensaje de confirmación al usuario

#### Scenario: Email inválido
- **WHEN** el usuario ingresa un email con formato inválido y intenta enviar
- **THEN** el formulario muestra un mensaje de error junto al campo email y no envía la solicitud

#### Scenario: Campo requerido vacío
- **WHEN** el usuario intenta enviar sin completar un campo requerido
- **THEN** el formulario muestra el mensaje de validación correspondiente y mantiene el foco en el primer campo inválido

#### Scenario: Endpoint stub responde 200
- **WHEN** llega un `POST /api/demo-request` con payload válido
- **THEN** el endpoint responde `200 OK` con `{ "ok": true }` sin persistir (stub de v1)

#### Scenario: Endpoint rechaza payload inválido
- **WHEN** llega un `POST /api/demo-request` con un payload que no cumple el schema
- **THEN** el endpoint responde `400 Bad Request` con detalle de los errores de validación

### Requirement: Registro únicamente por invitación

La landing page SHALL NO ofrecer un mecanismo de auto-registro público. Cualquier botón etiquetado "Registrarse" o equivalente SHALL llevar al formulario de solicitud de demo, no a un flujo de creación de cuenta.

#### Scenario: Botón "Registrarse" inexistente o redirigido
- **WHEN** el usuario busca en la landing un mecanismo para crear cuenta directamente
- **THEN** no existe tal mecanismo; los CTAs equivalentes ("Empezar", "Crear cuenta", "Registrarse") abren el formulario de solicitar demo

### Requirement: Footer con información legal y enlaces

La landing page SHALL incluir un footer con: nombre y logo de Docentix, enlace a Política de Privacidad (placeholder en v1), enlace a Términos de Uso (placeholder en v1), enlace de contacto (mailto o ancla al formulario) y año de copyright dinámico.

#### Scenario: Año dinámico en copyright
- **WHEN** se renderiza el footer
- **THEN** el año mostrado en el copyright corresponde al año actual del servidor en el momento del build

### Requirement: Contenido centralizado en archivos de constantes

Todo el copy textual de las secciones SHALL vivir en archivos de constantes bajo `next-app/content/landing/` (un archivo por sección o uno consolidado) y NO SHALL estar hardcodeado dentro de los componentes JSX.

#### Scenario: Edición de copy sin tocar componentes
- **WHEN** un desarrollador necesita cambiar el texto de una sección
- **THEN** SHALL poder hacerlo editando únicamente archivos en `content/landing/` sin modificar archivos en `components/landing/`

### Requirement: Idioma español con estructura preparada para i18n

La v1 SHALL servir todo el contenido en español. El copy SHALL estructurarse como objetos/constantes exportadas (no strings inline), de forma que una futura adopción de i18n pueda envolver esos objetos en diccionarios por locale sin reescribir componentes.

#### Scenario: Constantes exportadas por sección
- **WHEN** se inspecciona un archivo en `content/landing/`
- **THEN** exporta un objeto tipado (TypeScript) con los textos de su sección, no strings sueltos
