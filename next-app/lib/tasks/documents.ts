export const MAX_DOCUMENT_SIZE_BYTES = 25 * 1024 * 1024;
export const MAX_DOCUMENT_SIZE_LABEL = "25 MB";

export type AllowedDocumentExtension =
  | "pdf"
  | "doc"
  | "docx"
  | "xls"
  | "xlsx"
  | "ppt"
  | "pptx"
  | "zip";

type AllowedTypeEntry = {
  extension: AllowedDocumentExtension;
  mimeTypes: ReadonlyArray<string>;
};

export const ALLOWED_DOCUMENT_TYPES: ReadonlyArray<AllowedTypeEntry> = [
  { extension: "pdf", mimeTypes: ["application/pdf"] },
  { extension: "doc", mimeTypes: ["application/msword"] },
  {
    extension: "docx",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
  { extension: "xls", mimeTypes: ["application/vnd.ms-excel"] },
  {
    extension: "xlsx",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
  },
  { extension: "ppt", mimeTypes: ["application/vnd.ms-powerpoint"] },
  {
    extension: "pptx",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
  },
  {
    extension: "zip",
    mimeTypes: ["application/zip", "application/x-zip-compressed"],
  },
];

export const ALLOWED_EXTENSIONS: ReadonlyArray<AllowedDocumentExtension> =
  ALLOWED_DOCUMENT_TYPES.map((t) => t.extension);

export const ALLOWED_MIME_TYPES: ReadonlyArray<string> =
  ALLOWED_DOCUMENT_TYPES.flatMap((t) => t.mimeTypes);

function extractExtension(fileName: string): string | null {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === fileName.length - 1) return null;
  return fileName.slice(lastDot + 1).toLowerCase();
}

export type ValidateDocumentResult =
  | { ok: true; extension: AllowedDocumentExtension }
  | { ok: false; error: string };

export function validateDocumentInput({
  fileName,
  mimeType,
  sizeBytes,
}: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}): ValidateDocumentResult {
  if (!fileName.trim()) {
    return { ok: false, error: "El archivo no tiene nombre." };
  }
  const extension = extractExtension(fileName);
  if (!extension) {
    return {
      ok: false,
      error:
        "El archivo no tiene extensión reconocible. Renómbralo e inténtalo de nuevo.",
    };
  }
  const entry = ALLOWED_DOCUMENT_TYPES.find((t) => t.extension === extension);
  if (!entry) {
    return {
      ok: false,
      error: `Tipo de archivo no permitido. Acepta: ${ALLOWED_EXTENSIONS.join(", ")}.`,
    };
  }
  if (!entry.mimeTypes.includes(mimeType)) {
    return {
      ok: false,
      error:
        "El tipo del archivo no coincide con su extensión. Verifica el archivo.",
    };
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, error: "Tamaño de archivo inválido." };
  }
  if (sizeBytes > MAX_DOCUMENT_SIZE_BYTES) {
    return {
      ok: false,
      error: `El archivo supera el tamaño máximo de ${MAX_DOCUMENT_SIZE_LABEL}.`,
    };
  }
  return { ok: true, extension: extension as AllowedDocumentExtension };
}

export function buildTaskDocumentKey({
  organizationId,
  taskId,
  extension,
  uuid,
}: {
  organizationId: string;
  taskId: string;
  extension: string;
  uuid: string;
}): string {
  const ext = extension.toLowerCase();
  return `task-documents/${organizationId}/${taskId}/${uuid}.${ext}`;
}
