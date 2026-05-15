"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  FileArchiveIcon,
  FileDocIcon,
  FilePdfIcon,
  FilePptIcon,
  FileTextIcon,
  FileXlsIcon,
  DownloadSimpleIcon,
  PaperclipIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  deleteTaskDocument,
  getTaskDocumentDownloadUrl,
  uploadTaskDocument,
} from "@/lib/tasks/document-actions";
import {
  ALLOWED_EXTENSIONS,
  MAX_DOCUMENT_SIZE_LABEL,
  validateDocumentInput,
  type AllowedDocumentExtension,
} from "@/lib/tasks/documents";
import type { TaskDocumentView } from "@/lib/tasks/queries";
import { cn } from "@/lib/utils";

const ACCEPT_ATTR = ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(",");

const RELATIVE = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

function formatRelative(date: Date, now: Date): string {
  const diffMs = date.getTime() - now.getTime();
  const absSec = Math.abs(diffMs) / 1000;
  if (absSec < 60) return "ahora";
  const minutes = Math.round(diffMs / 60000);
  if (Math.abs(minutes) < 60) return RELATIVE.format(minutes, "minute");
  const hours = Math.round(diffMs / 3600000);
  if (Math.abs(hours) < 24) return RELATIVE.format(hours, "hour");
  const days = Math.round(diffMs / 86400000);
  if (Math.abs(days) < 30) return RELATIVE.format(days, "day");
  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return RELATIVE.format(months, "month");
  const years = Math.round(days / 365);
  return RELATIVE.format(years, "year");
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

function extensionOf(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  if (idx <= 0) return "";
  return fileName.slice(idx + 1).toLowerCase();
}

function IconForFile({ fileName }: { fileName: string }) {
  const ext = extensionOf(fileName) as AllowedDocumentExtension | "";
  const className = "size-6 shrink-0";
  switch (ext) {
    case "pdf":
      return <FilePdfIcon className={className} />;
    case "doc":
    case "docx":
      return <FileDocIcon className={className} />;
    case "xls":
    case "xlsx":
      return <FileXlsIcon className={className} />;
    case "ppt":
    case "pptx":
      return <FilePptIcon className={className} />;
    case "zip":
      return <FileArchiveIcon className={className} />;
    default:
      return <FileTextIcon className={className} />;
  }
}

function uploaderLabel(doc: TaskDocumentView): string {
  if (!doc.uploaderId) return "Usuario eliminado";
  return doc.uploaderName?.trim() || doc.uploaderEmail?.trim() || "Sin nombre";
}

export function TaskDocumentsPanel({
  taskId,
  documents,
  canUploadDocument,
}: {
  taskId: string;
  documents: TaskDocumentView[];
  canUploadDocument: boolean;
}) {
  const router = useRouter();
  const [now, setNow] = useState<Date>(() => new Date());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const onPickFile = () => {
    setError(null);
    inputRef.current?.click();
  };

  const onFileSelected = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      const validation = validateDocumentInput({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
      if (!validation.ok) {
        setError(validation.error);
        return;
      }

      const formData = new FormData();
      formData.append("taskId", taskId);
      formData.append("file", file);

      setError(null);
      startTransition(async () => {
        const result = await uploadTaskDocument(formData);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.refresh();
      });
    },
    [router, taskId],
  );

  const onDownload = (documentId: string) => {
    setError(null);
    setBusyId(documentId);
    startTransition(async () => {
      const result = await getTaskDocumentDownloadUrl({ documentId });
      setBusyId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.assign(result.data.url);
    });
  };

  const onDelete = (documentId: string) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("¿Eliminar este documento? Esta acción no se puede deshacer.")
    ) {
      return;
    }
    setError(null);
    setBusyId(documentId);
    startTransition(async () => {
      const result = await deleteTaskDocument({ documentId });
      setBusyId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <section className="bg-muted/20 flex h-full min-h-0 flex-col">
      {canUploadDocument ? (
        <div className="border-b p-4">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={onFileSelected}
            disabled={isPending}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={onPickFile}
              disabled={isPending}
            >
              <PaperclipIcon />
              Adjuntar documento
            </Button>
            <span className="text-muted-foreground text-xs">
              Hasta {MAX_DOCUMENT_SIZE_LABEL}. Formatos: {ALLOWED_EXTENSIONS.join(", ")}.
            </span>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="border-b p-3">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      ) : null}

      <ul className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        {documents.length === 0 ? (
          <li className="text-muted-foreground text-sm italic">
            Aún no hay documentos adjuntos.
          </li>
        ) : (
          documents.map((doc) => {
            const isBusy = busyId === doc.id && isPending;
            return (
              <li
                key={doc.id}
                className={cn(
                  "bg-card flex items-center gap-3 rounded-md border p-3",
                )}
              >
                <IconForFile fileName={doc.fileName} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {doc.fileName}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {formatFileSize(doc.sizeBytes)} · Subido por{" "}
                    {uploaderLabel(doc)} {formatRelative(doc.createdAt, now)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onDownload(doc.id)}
                    disabled={isBusy}
                  >
                    <DownloadSimpleIcon />
                    Descargar
                  </Button>
                  {doc.canDelete ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Eliminar documento"
                      title="Eliminar"
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => onDelete(doc.id)}
                      disabled={isBusy}
                    >
                      <TrashIcon />
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
