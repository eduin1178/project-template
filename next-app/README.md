This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Este proyecto usa **pnpm** como gestor de paquetes (fijado vía `packageManager` en `package.json`). Si no lo tenés, habilitalo con Corepack:

```bash
corepack enable
corepack prepare pnpm@11.1.2 --activate
```

Instalá dependencias y arrancá el dev server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Configuración de Cloudflare R2

El proyecto usa Cloudflare R2 (S3-compatible) para almacenar assets públicos como los logos de organizaciones. El módulo está en [`lib/storage/r2.ts`](lib/storage/r2.ts) y se consume desde las server actions que manejan uploads.

### Variables de entorno

Agrega estas variables a `.env.local` (desarrollo) y al entorno de producción:

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE_URL=
```

| Variable | Dónde obtenerla |
|----------|-----------------|
| `R2_ACCOUNT_ID` | Cloudflare dashboard → R2 → cualquier bucket → "Account ID" en la columna derecha |
| `R2_ACCESS_KEY_ID` y `R2_SECRET_ACCESS_KEY` | R2 → **Manage R2 API Tokens** → crear token con permiso de lectura/escritura sobre el bucket. El secret solo se muestra una vez |
| `R2_BUCKET` | Nombre del bucket (por ejemplo, `docentix`) |
| `R2_PUBLIC_BASE_URL` | URL base pública del bucket (ver siguiente sección). **No** uses el endpoint S3 `https://<account>.r2.cloudflarestorage.com` — ese requiere autenticación |

### Configurar acceso público al bucket

R2 no sirve archivos públicamente por defecto. Hay dos formas:

#### Opción A — Subdominio r2.dev (solo desarrollo)

1. Cloudflare → R2 → tu bucket → **Settings**
2. Sección **R2.dev subdomain** → **Allow Access**
3. Cloudflare genera una URL del tipo `https://pub-<hash>.r2.dev`
4. Úsala como `R2_PUBLIC_BASE_URL`

> Cloudflare limita el ancho de banda en `r2.dev` y no recomienda usarlo en producción.

#### Opción B — Custom Domain (recomendado en producción)

1. Cloudflare → R2 → tu bucket → **Settings** → **Custom Domains** → **Connect Domain**
2. Conecta un subdominio que controles, por ejemplo `cdn.tudominio.com`. Si el dominio está en tu cuenta Cloudflare, el CNAME y el SSL se configuran automáticamente.
3. Cuando termine la propagación (~1 min), usa esa URL como `R2_PUBLIC_BASE_URL`:

```env
R2_PUBLIC_BASE_URL=https://cdn.tudominio.com
```

La migración entre Opción A y B es solo cambiar la env var: los archivos viejos seguirán accesibles porque el bucket no cambia.

### CORS

Para uso con `<img src>` no es necesario. Si en el futuro se hace `fetch` o se renderiza en `<canvas>`, agregar una política CORS en el bucket:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://tudominio.com"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"]
  }
]
```

### Convenciones del proyecto

- **Keys**: `org-logos/<organizationId>/<uuid>.<ext>` (ver `buildLogoKey` en `lib/storage/r2.ts`)
- **MIME aceptados** para logos: `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`
- **Tamaño máximo**: 1 MB por archivo. Se valida client-side y server-side.
- **Reemplazo de logo**: al subir uno nuevo se persiste primero el nuevo URL en BD y luego se borra el anterior best-effort. Si el delete falla, se loggea pero no rompe la operación.

### Verificación rápida

Si una imagen no aparece tras subirla:

1. Copia el URL guardado en `organization.logo` y ábrelo en el navegador.
2. **401/403**: el bucket no tiene acceso público habilitado. Configurá Opción A o B.
3. **404**: el `R2_PUBLIC_BASE_URL` no coincide con el patrón público real del bucket.
4. **XML "AccessDenied"**: `R2_PUBLIC_BASE_URL` apunta al endpoint S3 en vez del público.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
