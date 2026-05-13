## ADDED Requirements

### Requirement: Módulo `lib/storage/r2.ts` para Cloudflare R2

El sistema SHALL exponer un módulo server-only `lib/storage/r2.ts` que encapsule la integración con Cloudflare R2 vía `@aws-sdk/client-s3`. El módulo SHALL exportar al menos: `uploadPublicAsset({ key, body, contentType })` y `deletePublicAsset({ key })`. El cliente S3 SHALL configurarse con `region: "auto"` y `endpoint: https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`.

#### Scenario: Upload exitoso retorna URL pública
- **WHEN** `uploadPublicAsset` se invoca con un body válido y la config R2 presente
- **THEN** ejecuta `PutObjectCommand` contra `R2_BUCKET` con el `Key` provisto, y retorna `{ url: "${R2_PUBLIC_BASE_URL}/${key}" }`

#### Scenario: Delete best-effort
- **WHEN** `deletePublicAsset` se invoca con un `key` existente
- **THEN** ejecuta `DeleteObjectCommand`; si falla, propaga el error para que el caller decida (los callers de logos lo capturan y loggean)

#### Scenario: Módulo server-only
- **WHEN** se intenta importar `lib/storage/r2.ts` desde un componente cliente
- **THEN** el bundler/lint falla por la directiva `"server-only"` declarada en el módulo

### Requirement: Variables de entorno requeridas

El sistema SHALL requerir las variables `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` y `R2_PUBLIC_BASE_URL`. Si cualquiera está ausente al invocar una operación de R2, el módulo SHALL lanzar un error explícito.

#### Scenario: Config completa
- **WHEN** todas las variables están definidas y se invoca `uploadPublicAsset`
- **THEN** la operación procede normalmente

#### Scenario: Variable faltante
- **WHEN** alguna variable R2_* está ausente y se invoca `uploadPublicAsset` o `deletePublicAsset`
- **THEN** el módulo lanza `Error("Cloudflare R2 no está configurado: falta {VAR_NAME}")` antes de tocar la red

#### Scenario: `.env.example` documenta las variables
- **WHEN** se inspecciona `.env.example`
- **THEN** contiene entradas (sin valores reales) para las cinco variables R2_*

### Requirement: Validación de uploads del lado consumidor

Los callers de `uploadPublicAsset` SHALL validar MIME y tamaño antes de invocar el módulo. El módulo en sí NO SHALL realizar validaciones de contenido más allá de aceptar el `contentType` que recibe. Esta separación mantiene `lib/storage/r2.ts` agnóstico al dominio.

#### Scenario: Caller valida y delega
- **WHEN** el caller (por ejemplo, la action de upload de logo) recibe un `File`
- **THEN** valida MIME y tamaño según su propia política, y solo entonces invoca `uploadPublicAsset`

#### Scenario: Módulo no inspecciona contenido
- **WHEN** se inspecciona la implementación de `uploadPublicAsset`
- **THEN** no hay lógica que reabra el body para inspeccionar bytes o validar MIME
