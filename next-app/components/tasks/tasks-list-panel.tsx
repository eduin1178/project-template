"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  type TaskStatus,
  type TaskVisibility,
} from "@/lib/db/schema/task";
import type { TaskListItem } from "@/lib/tasks/queries";
import { cn } from "@/lib/utils";

const VISIBILITY_LABEL: Record<TaskVisibility, string> = {
  draft: "Borrador",
  active: "Activa",
  archived: "Archivada",
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Pendiente",
  in_progress: "En curso",
  done: "Hecha",
};

const VISIBILITY_VARIANT: Record<
  TaskVisibility,
  "secondary" | "default" | "outline"
> = {
  draft: "outline",
  active: "default",
  archived: "secondary",
};

const STATUS_VARIANT: Record<
  TaskStatus,
  "secondary" | "default" | "outline"
> = {
  pending: "outline",
  in_progress: "default",
  done: "secondary",
};

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "hace un momento";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `hace ${days} d`;
  const months = Math.round(days / 30);
  if (months < 12) return `hace ${months} m`;
  const years = Math.round(months / 12);
  return `hace ${years} año${years === 1 ? "" : "s"}`;
}

export function TasksListPanel({
  tasks,
  selectedId,
}: {
  tasks: TaskListItem[];
  selectedId: string | null;
}) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => {
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [tasks, query]);

  function buildHref(taskId: string): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set("taskId", taskId);
    return `/admin/tasks?${params.toString()}`;
  }

  return (
    <>
      <div className="border-b p-3">
        <div className="relative">
          <MagnifyingGlassIcon
            className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar"
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={query ? "Sin coincidencias" : "Sin tareas todavía"}
              description={
                query
                  ? "Prueba con otro término de búsqueda."
                  : "Crea la primera tarea de tu organización para empezar."
              }
            />
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((t) => {
              const visibility = t.visibility as TaskVisibility;
              const status = t.status as TaskStatus;
              const isSelected = t.id === selectedId;
              return (
                <li key={t.id}>
                  <Link
                    href={buildHref(t.id)}
                    className={cn(
                      "hover:bg-muted/60 block rounded-lg border p-3 text-left transition-colors",
                      isSelected
                        ? "border-primary bg-muted/40"
                        : "border-border bg-card",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium leading-tight">{t.title}</div>
                      <div className="text-muted-foreground shrink-0 text-xs">
                        {formatRelative(t.createdAt)}
                      </div>
                    </div>
                    {t.description ? (
                      <p className="text-muted-foreground mt-1.5 line-clamp-2 text-xs">
                        {t.description}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant={VISIBILITY_VARIANT[visibility]}>
                        {VISIBILITY_LABEL[visibility]}
                      </Badge>
                      <Badge variant={STATUS_VARIANT[status]}>
                        {STATUS_LABEL[status]}
                      </Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
