## MODIFIED Requirements

### Requirement: Módulo `lib/storage/r2.ts` para Cloudflare R2

El sistema SHALL exponer un módulo server-only `lib/storage/r2.ts` que encapsule la integración con Cloudflare R2 vía `@aws-sdk/client-s3`. El módulo SHALL exportar al menos: `uploadPublicAsset({ key, body, contentType })`, `deletePublicAsset({ key })`, `uploadPrivateAsset({ key, body, contentType, bucket })`, `deletePrivateAsset({ key, bucket })` y `getPresignedDownloadUrl({ key, bucket, expiresIn, downloadFilename })`. El cliente S3 SHALL configurarse con `region: "auto"` y `endpoint: https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`. Las primitivas de assets públicos SHALL operar sobre el bucket configurado por `R2_BUCKET`. Las primitivas privadas SHALL recibir el `bucket` como parámetro para permitir múltiples buckets privados (el caller decide cuál usar; por convención el bucket privado para documentos de tareas es `R2_DOCUMENTS_BUCKET`).

#### Scenario: Upload público retorna URL pública

- **WHEN** `uploadPublicAsset` se invoca con un body válido y la config R2 presente
- **THEN** ejecuta `PutObjectCommand` contra `R2_BUCKET` con el `Key` provisto, y retorna `{ url: "${R2_PUBLIC_BASE_URL}/${key}" }`

#### Scenario: Delete público best-effort

- **WHEN** `deletePublicAsset` se invoca con un `key` existente
- **THEN** ejecuta `DeleteObjectCommand` contra `R2_BUCKET`; si falla, propaga el error para que el caller decida (los callers de logos lo capturan y loggean)

#### Scenario: Upload privado contra bucket parametrizado

- **WHEN** `uploadPrivateAsset` se invoca con `bucket = "docentix-documents"`, un `key`, un `body` y un `contentType`
- **THEN** ejecuta `PutObjectCommand` contra el bucket recibido como parámetro y NO retorna URL pública (la descarga se hace después vía URL firmada)

#### Scenario: Delete privado contra bucket parametrizado

- **WHEN** `deletePrivateAsset` se invoca con `bucket` y `key` válidos
- **THEN** ejecuta `DeleteObjectCommand` contra ese bucket; si falla, propaga el error al caller

#### Scenario: Presigned download URL con TTL y nombre de descarga

- **WHEN** `getPresignedDownloadUrl` se invoca con `bucket`, `key`, `expiresIn: 300` y `downloadFilename: "Informe.pdf"`
- **THEN** retorna una URL firmada GET válida por aproximadamente 5 minutos que incluye `ResponseContentDisposition` con `attachment; filename="Informe.pdf"` y `filename*=UTF-8''<percent-encoded>` para preservar el nombre original al descargar

#### Scenario: Módulo server-only

- **WHEN** se intenta importar `lib/storage/r2.ts` desde un componente cliente
- **THEN** el bundler/lint falla por la directiva `"server-only"` declarada en el módulo

### Requirement: Variables de entorno requeridas

El sistema SHALL requerir las variables `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL` y `R2_DOCUMENTS_BUCKET`. Las cinco primeras son requeridas para operaciones sobre el bucket público (logos). `R2_DOCUMENTS_BUCKET` es requerida para operaciones privadas de documentos de tareas. Si una variable necesaria para la operación invocada está ausente, el módulo SHALL lanzar un error explícito antes de tocar la red. Las credenciales (`R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`) SHALL ser válidas para ambos buckets (mismo account R2).

#### Scenario: Config completa para operación pública

- **WHEN** todas las variables públicas están definidas y se invoca `uploadPublicAsset`
- **THEN** la operación procede normalmente

#### Scenario: Config completa para operación privada

- **WHEN** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` y `R2_DOCUMENTS_BUCKET` están definidos, y se invoca `uploadPrivateAsset` con `bucket = process.env.R2_DOCUMENTS_BUCKET`
- **THEN** la operación procede normalmente

#### Scenario: Variable pública faltante

- **WHEN** alguna de `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` o `R2_PUBLIC_BASE_URL` está ausente y se invoca `uploadPublicAsset` o `deletePublicAsset`
- **THEN** el módulo lanza `Error("Cloudflare R2 no está configurado: falta {VAR_NAME}")` antes de tocar la red

#### Scenario: Variable `R2_DOCUMENTS_BUCKET` faltante

- **WHEN** el caller intenta invocar `uploadPrivateAsset`, `deletePrivateAsset` o `getPresignedDownloadUrl` con `bucket = process.env.R2_DOCUMENTS_BUCKET` y la variable está ausente
- **THEN** el módulo lanza un error explícito indicando que `R2_DOCUMENTS_BUCKET` no está configurado

#### Scenario: `.env.example` documenta las variables

- **WHEN** se inspecciona `.env.example`
- **THEN** contiene entradas (sin valores reales) para las seis variables: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL` y `R2_DOCUMENTS_BUCKET`

## ADDED Requirements

### Requirement: Bucket privado dedicado para documentos

El sistema SHALL operar contra dos buckets en el mismo account de Cloudflare R2: un bucket público (configurado por `R2_BUCKET` y servido bajo `R2_PUBLIC_BASE_URL`) usado para logos y otros assets públicos, y un bucket privado (configurado por `R2_DOCUMENTS_BUCKET`) usado para documentos de tareas. El bucket privado SHALL tener acceso público deshabilitado en Cloudflare. Las descargas desde el bucket privado SHALL ocurrir exclusivamente a través de URLs firmadas generadas por `getPresignedDownloadUrl`.

#### Scenario: Bucket público sirve logos

- **WHEN** se sube un logo de organización vía `uploadPublicAsset`
- **THEN** el objeto queda en `R2_BUCKET` y es accesible vía `${R2_PUBLIC_BASE_URL}/${key}` sin firma

#### Scenario: Bucket privado no expone objetos sin firma

- **WHEN** un cliente intenta acceder a un objeto del bucket privado por URL directa sin firma
- **THEN** Cloudflare R2 rechaza la petición (acceso público deshabilitado)

#### Scenario: URL firmada permite descarga temporal

- **WHEN** una server action invoca `getPresignedDownloadUrl` y entrega la URL al cliente
- **THEN** el cliente puede descargar el objeto del bucket privado durante el TTL configurado y la URL deja de servir al expirar
