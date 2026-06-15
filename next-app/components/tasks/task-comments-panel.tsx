"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";

import { PaperPlaneRightIcon, TrashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  createComment,
  deleteComment,
} from "@/lib/tasks/comment-actions";
import type { TaskCommentView } from "@/lib/tasks/queries";

import { UserAvatar } from "./user-avatar";

function personLabel(name: string | null, email: string | null): string {
  return name?.trim() || email?.trim() || "Sin nombre";
}

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

function deletionPlaceholder(comment: TaskCommentView): string {
  if (
    comment.deletedByEmail &&
    comment.authorEmail &&
    comment.deletedByEmail === comment.authorEmail
  ) {
    return "Comentario eliminado por el autor.";
  }
  const who = comment.deletedByName?.trim() || comment.deletedByEmail || "un administrador";
  return `Comentario eliminado por ${who}.`;
}

export function TaskCommentsPanel({
  taskId,
  comments,
  canComment,
}: {
  taskId: string;
  comments: TaskCommentView[];
  canComment: boolean;
}) {
  const router = useRouter();
  const [now, setNow] = useState<Date>(() => new Date());
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const listRef = useRef<HTMLUListElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const sorted = useMemo(
    () =>
      [...comments].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      ),
    [comments],
  );

  const scrollToBottom = useCallback(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, []);

  // Scroll al final cuando cambia la cantidad o ids de comentarios.
  const lastId = sorted[sorted.length - 1]?.id;
  const sortedLength = sorted.length;
  useLayoutEffect(() => {
    scrollToBottom();
  }, [scrollToBottom, sortedLength, lastId]);

  // Cuando el tab se activa (Radix hace display:none en tabs inactivos),
  // el contenedor pasa de 0 a >0 de alto: scrollear al fondo en ese momento.
  useEffect(() => {
    const node = listRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (node.clientHeight > 0) scrollToBottom();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [scrollToBottom]);

  const submit = useCallback(() => {
    if (isPending) return;
    const trimmed = body.trim();
    if (!trimmed) {
      setError("El comentario no puede estar vacío.");
      return;
    }
    setError(null);
    // Mantener el foco para encadenar varios mensajes
    textareaRef.current?.focus();
    startTransition(async () => {
      const result = await createComment({ taskId, body: trimmed });
      if (!result.ok) {
        setError(result.error);
        textareaRef.current?.focus();
        return;
      }
      setBody("");
      router.refresh();
      textareaRef.current?.focus();
    });
  }, [body, isPending, router, taskId]);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!isPending) submit();
    }
  };

  const remove = (commentId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await deleteComment({ commentId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <section className="bg-muted/20 flex h-full min-h-0 flex-col">
      <ul
        ref={listRef}
        className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
      >
        {sorted.length === 0 ? (
          <li className="text-muted-foreground text-sm italic">
            Aún no hay comentarios en esta tarea.
          </li>
        ) : (
          sorted.map((comment) => {
            const isDeleted = comment.deletedAt !== null;
            const isOwn = comment.isOwn;
            const label = personLabel(
              comment.authorName,
              comment.authorEmail,
            );
            return (
              <li
                key={comment.id}
                className={cn(
                  "flex items-end gap-2",
                  isOwn ? "flex-row-reverse" : "flex-row",
                )}
              >
                <UserAvatar
                  name={comment.authorName}
                  email={comment.authorEmail}
                  image={comment.authorImage}
                  className="size-8 shrink-0"
                />
                <div
                  className={cn(
                    "flex max-w-[75%] min-w-0 flex-col gap-1",
                    isOwn ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-2 text-xs",
                      isOwn ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    <span className="text-foreground font-medium">
                      {isOwn ? "Tú" : label}
                    </span>
                    <span className="text-muted-foreground">
                      {formatRelative(comment.createdAt, now)}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "group relative rounded-2xl px-3 py-2 shadow-sm",
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card text-card-foreground border rounded-bl-sm",
                    )}
                  >
                    {isDeleted ? (
                      <p
                        className={cn(
                          "text-sm italic",
                          isOwn
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground",
                        )}
                      >
                        {deletionPlaceholder(comment)}
                      </p>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
                        {comment.body}
                      </p>
                    )}
                    {comment.canDelete ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="Eliminar comentario"
                        title="Eliminar"
                        className={cn(
                          "absolute -top-3 size-8 rounded-full border bg-background text-destructive hover:bg-destructive hover:text-destructive-foreground",
                          isOwn ? "-left-3" : "-right-3",
                        )}
                        onClick={() => remove(comment.id)}
                        disabled={isPending}
                      >
                        <TrashIcon />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>

      {canComment ? (
        <div className="space-y-2 border-t p-4">
          <Textarea
            ref={textareaRef}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Escribe un comentario… (Enter envía, Shift+Enter agrega salto de línea)"
            rows={2}
            className="bg-background max-h-30 min-h-15 resize-y"
            maxLength={2000}
          />
          {error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : null}
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={submit}
              disabled={isPending || body.trim().length === 0}
            >
              <PaperPlaneRightIcon />
              Enviar
            </Button>
          </div>
        </div>
      ) : error ? (
        <p className="border-t p-4 text-sm text-destructive">{error}</p>
      ) : null}
    </section>
  );
}
