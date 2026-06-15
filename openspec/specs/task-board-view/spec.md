# task-board-view Specification

## Purpose

Vista visual de tareas con modos alternables tablero por estado y tarjetas sin columnas, filtros preservados en URL y comportamiento responsive para desktop y mobile.

## Requirements

### Requirement: Modos visuales de listado de tareas
El sistema SHALL renderizar las rutas de listado de tareas mediante una experiencia visual con dos modos alternables: `board` y `cards`. El modo `board` SHALL agrupar tareas por `status` en columnas `Pendiente`, `En curso` y `Hecha`. El modo `cards` SHALL renderizar las mismas tareas como una grilla/lista de tarjetas sin columnas. Si el modo no está presente en la URL o tiene un valor inválido, el sistema SHALL usar `board` como default.

#### Scenario: Default a tablero por estado
- **WHEN** un usuario navega a `/tasks` o `/admin/tasks` sin search param de modo de vista
- **THEN** el listado se renderiza en modo `board` con columnas por estado

#### Scenario: Toggle a tarjetas sin columnas
- **WHEN** un usuario pulsa el control para cambiar a vista de tarjetas
- **THEN** la URL se actualiza con `view=cards` y las tareas se renderizan como tarjetas sin columnas, preservando los filtros vigentes

#### Scenario: Toggle de regreso a tablero
- **WHEN** un usuario está en `view=cards` y pulsa el control para cambiar a tablero
- **THEN** la URL se actualiza con `view=board` y las tareas se agrupan por estado

#### Scenario: Modo inválido usa default seguro
- **WHEN** un usuario navega con `view=calendar` o cualquier valor no soportado
- **THEN** el sistema renderiza modo `board` sin fallar

### Requirement: Columnas del tablero por estado
El sistema SHALL mostrar en modo `board` una columna por cada estado incluido en el filtro efectivo de `status`. Cada columna SHALL mostrar título, conteo de tareas visibles en esa columna y tarjetas ordenadas por el criterio default del listado. Si una columna no tiene tareas, SHALL mostrar un estado vacío compacto dentro de esa columna.

#### Scenario: Tareas agrupadas por status
- **WHEN** el listado contiene tareas `pending`, `in_progress` y `done`
- **THEN** cada tarea aparece únicamente en la columna que corresponde a su `status`

#### Scenario: Filtro de status limita columnas
- **WHEN** el usuario filtra por `status=pending,in_progress`
- **THEN** el tablero muestra columnas para `Pendiente` y `En curso`, y no muestra columna `Hecha`

#### Scenario: Columna vacía muestra estado compacto
- **WHEN** el filtro incluye `done` pero no existen tareas visibles con `status = "done"`
- **THEN** la columna `Hecha` se muestra con conteo cero y un mensaje vacío compacto

### Requirement: Filtro por visibilidad en listado visual
El sistema SHALL aplicar el filtro por `visibility` como filtro transversal sobre ambos modos visuales. El filtro SHALL estar disponible cuando el viewer tenga permiso para listar más de una visibilidad de tareas. Para viewers cuya autorización solo permite `active`, el sistema SHALL ocultar el control de `visibility` o presentarlo como valor fijo no editable.

#### Scenario: Admin filtra por visibilidad en tablero
- **WHEN** un admin abre `/admin/tasks` y selecciona `visibility=draft,active`
- **THEN** el tablero muestra solo tareas `draft` o `active` de la organización, agrupadas por status

#### Scenario: Vista tarjetas respeta visibilidad
- **WHEN** un admin cambia a `view=cards` con `visibility=archived`
- **THEN** la grilla muestra solo tarjetas de tareas archivadas que cumplan los demás filtros

#### Scenario: Member regular no ve filtro inútil de visibilidad
- **WHEN** un member regular abre `/tasks`
- **THEN** no se le ofrece un filtro editable de `visibility` porque su listado efectivo está limitado a tareas `active` visibles

### Requirement: Tarjeta de tarea informativa y accionable
Cada tarjeta de tarea SHALL mostrar información suficiente para decidir si abrirla: título, status, visibility cuando aplique, fecha de vencimiento o ausencia de plazo, responsable cuando exista, indicador de vencimiento cuando aplique y resumen breve de descripción si existe. Hacer click en una tarjeta SHALL navegar a la ruta canónica de detalle `[taskId]`, preservando filtros y modo de vista en la URL.

#### Scenario: Tarjeta navega preservando contexto
- **WHEN** un usuario hace click en una tarjeta desde `/admin/tasks?view=board&visibility=active&status=pending`
- **THEN** el navegador navega a `/admin/tasks/<id>?view=board&visibility=active&status=pending`

#### Scenario: Tarjeta muestra vencimiento
- **WHEN** una tarea visible tiene `dueAt` vencido y `visibility = "active"`
- **THEN** su tarjeta muestra un indicador visual de plazo vencido

#### Scenario: Tarjeta sin responsable
- **WHEN** una tarea no tiene `responsibleId`
- **THEN** la tarjeta muestra un texto neutral como `Sin responsable` o equivalente, sin romper el layout

### Requirement: Responsividad del listado visual
El sistema SHALL adaptar ambos modos a pantallas móviles. En mobile, el modo `board` SHALL apilar columnas verticalmente con scroll natural de página, y el modo `cards` SHALL usar una sola columna de tarjetas. Los controles de filtro y toggle SHALL ser accesibles por tacto, visibles o alcanzables desde la cabecera del listado, y no dependerán de hover.

#### Scenario: Board mobile apila columnas
- **WHEN** un usuario abre el tablero en viewport mobile
- **THEN** las columnas se muestran apiladas verticalmente y pueden recorrerse con scroll natural

#### Scenario: Cards mobile usa una columna
- **WHEN** un usuario abre `view=cards` en viewport mobile
- **THEN** las tarjetas se muestran en una sola columna legible

#### Scenario: Toggle accesible en mobile
- **WHEN** un usuario usa una pantalla táctil
- **THEN** el control para alternar `board`/`cards` es visible o alcanzable y tiene tamaño táctil adecuado

### Requirement: Sin drag-and-drop en v1
El sistema SHALL NO permitir cambiar `status` arrastrando tarjetas entre columnas en esta iteración. Las transiciones de status SHALL seguir usando los controles existentes que invocan la server action con comentario obligatorio.

#### Scenario: Arrastrar tarjeta no cambia status
- **WHEN** un usuario intenta arrastrar una tarjeta entre columnas
- **THEN** la UI no ofrece drop target funcional ni invoca cambio de status
