import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type R2Credentials = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
};

type R2PublicConfig = R2Credentials & {
  bucket: string;
  publicBaseUrl: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Cloudflare R2 no está configurado: falta ${name}`);
  }
  return value;
}

function requireR2Credentials(): R2Credentials {
  return {
    accountId: requireEnv("R2_ACCOUNT_ID"),
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
  };
}

function requireR2Config(): R2PublicConfig {
  return {
    ...requireR2Credentials(),
    bucket: requireEnv("R2_BUCKET"),
    publicBaseUrl: requireEnv("R2_PUBLIC_BASE_URL"),
  };
}

export function requireDocumentsBucket(): string {
  return requireEnv("R2_DOCUMENTS_BUCKET");
}

let cachedClient: S3Client | null = null;
let cachedFor: string | null = null;

function r2Client(credentials: R2Credentials): S3Client {
  if (cachedClient && cachedFor === credentials.accountId) {
    return cachedClient;
  }
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${credentials.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  });
  cachedFor = credentials.accountId;
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

export type PrivateUploadInput = UploadInput & { bucket: string };

export async function uploadPrivateAsset(input: PrivateUploadInput): Promise<void> {
  if (!input.bucket) {
    throw new Error("uploadPrivateAsset: bucket es requerido.");
  }
  const credentials = requireR2Credentials();
  const client = r2Client(credentials);
  await client.send(
    new PutObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    }),
  );
}

export async function deletePrivateAsset({
  key,
  bucket,
}: {
  key: string;
  bucket: string;
}): Promise<void> {
  if (!bucket) {
    throw new Error("deletePrivateAsset: bucket es requerido.");
  }
  const credentials = requireR2Credentials();
  const client = r2Client(credentials);
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

function sanitizeFilenameForHeader(name: string): string {
  return name.replace(/\\/g, "_").replace(/"/g, "_");
}

function buildContentDisposition(downloadFilename: string): string {
  const ascii = sanitizeFilenameForHeader(
    downloadFilename.replace(/[^\x20-\x7E]/g, "_"),
  );
  const encoded = encodeURIComponent(downloadFilename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export async function getPresignedDownloadUrl({
  key,
  bucket,
  expiresIn,
  downloadFilename,
}: {
  key: string;
  bucket: string;
  expiresIn: number;
  downloadFilename: string;
}): Promise<string> {
  if (!bucket) {
    throw new Error("getPresignedDownloadUrl: bucket es requerido.");
  }
  const credentials = requireR2Credentials();
  const client = r2Client(credentials);
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: buildContentDisposition(downloadFilename),
  });
  return getSignedUrl(client, command, { expiresIn });
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
