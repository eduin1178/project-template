import "server-only";

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
};

function requireR2Config(): R2Config {
  const env = {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET,
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL,
  };
  for (const [key, value] of Object.entries(env)) {
    if (!value) {
      throw new Error(
        `Cloudflare R2 no está configurado: falta R2_${key
          .replace(/([A-Z])/g, "_$1")
          .toUpperCase()}`,
      );
    }
  }
  return env as R2Config;
}

let cachedClient: S3Client | null = null;
let cachedFor: string | null = null;

function r2Client(config: R2Config): S3Client {
  if (cachedClient && cachedFor === config.accountId) {
    return cachedClient;
  }
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  cachedFor = config.accountId;
  return cachedClient;
}

export type UploadInput = {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
};

export async function uploadPublicAsset(
  input: UploadInput,
): Promise<{ url: string }> {
  const config = requireR2Config();
  const client = r2Client(config);
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    }),
  );
  const base = config.publicBaseUrl.replace(/\/$/, "");
  return { url: `${base}/${input.key}` };
}

export async function deletePublicAsset({
  key,
}: {
  key: string;
}): Promise<void> {
  const config = requireR2Config();
  const client = r2Client(config);
  await client.send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
  );
}

export function buildLogoKey(
  organizationId: string,
  fileExtension: string,
): string {
  const ext = fileExtension.replace(/^\.+/, "").toLowerCase() || "bin";
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `org-logos/${organizationId}/${uuid}.${ext}`;
}

export function extractKeyFromPublicUrl(url: string): string | null {
  const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (!base || !url.startsWith(base + "/")) return null;
  return url.slice(base.length + 1);
}
