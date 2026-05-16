## ADDED Requirements

### Requirement: Helper interno `createTaskInternal` sin guard de autorización

El módulo de tareas SHALL exponer, para consumo server-side interno, una función `createTaskInternal` que realiza la inserción de una fila `task` con los campos provistos, SIN invocar el guard `requireOrgAdmin` y SIN validar el rol del invocador. La función SHALL recibir explícitamente `authorId`, `responsibleId`, `organizationId`, `title`, `description`, `visibility`, `status` y `dueAt` como parte del payload, y SHALL persistir esos valores tal como se reciben (respetando las restricciones de tipo y `NOT NULL` de la base).

La server action pública `createTask` SHALL mantener su guard `requireOrgAdmin` y, una vez pasado el guard y validado el payload, SHALL delegar la inserción concreta en `createTaskInternal`. La firma pública de `createTask` y su contrato externo NO SHALL cambiar.

`createTaskInternal` SHALL NO exportarse como server action al cliente: SHALL ser invocable solo desde otros módulos server-side dentro de `next-app/src/lib/**` o `next-app/src/app/**` (server-only).

#### Scenario: createTaskInternal inserta sin verificar rol
- **WHEN** un caller server-side invoca `createTaskInternal` con un payload válido sin que exista un `requireOrgAdmin` previo en el call stack
- **THEN** la fila se inserta en `task` con los valores provistos y la operación retorna éxito

#### Scenario: createTask público sigue exigiendo admin/owner
- **WHEN** un usuario con `member.role = "member"` (o sin membresía) invoca la server action pública `createTask`
- **THEN** la action falla con error de autorización antes de invocar `createTaskInternal` y no se persiste ninguna fila

#### Scenario: createTask delega en createTaskInternal
- **WHEN** un admin invoca la server action pública `createTask` con un payload válido
- **THEN** tras pasar `requireOrgAdmin` y validar el payload, la inserción concreta se realiza a través de `createTaskInternal`, evitando duplicar la lógica de inserción

#### Scenario: createTaskInternal acepta visibility="active" si dueAt y responsibleId están presentes
- **WHEN** un caller invoca `createTaskInternal` con `visibility = "active"`, `dueAt` definido y `responsibleId` definido
- **THEN** la fila se persiste con `visibility = "active"`; la regla de "dueAt y responsibleId obligatorios al activar" se cumple por construcción del payload
