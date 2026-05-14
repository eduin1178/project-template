"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  ArchiveIcon,
  CheckCircleIcon,
  ClockIcon,
  FileDashedIcon,
  LightningIcon,
  SpinnerIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  TASK_STATUS_VALUES,
  TASK_VISIBILITY_VALUES,
  type TaskStatus,
  type TaskVisibility,
} from "@/lib/db/schema/task";
import type { TaskCounts } from "@/lib/tasks/queries";
import { cn } from "@/lib/utils";

const VISIBILITY_META: Record<
  TaskVisibility,
  { label: string; icon: PhosphorIcon }
> = {
  draft: { label: "Borrador", icon: FileDashedIcon },
  active: { label: "Activa", icon: LightningIcon },
  archived: { label: "Archivada", icon: ArchiveIcon },
};

const STATUS_META: Record<TaskStatus, { label: string; icon: PhosphorIcon }> = {
  pending: { label: "Pendiente", icon: ClockIcon },
  in_progress: { label: "En curso", icon: SpinnerIcon },
  done: { label: "Hecha", icon: CheckCircleIcon },
};

function toggleValue<T extends string>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((v) => v !== value)
    : [...values, value];
}

type FilterItemProps = {
  label: string;
  icon: PhosphorIcon;
  count: number;
  active: boolean;
  onClick: () => void;
  disabled: boolean;
};

function FilterItem({
  label,
  icon: Icon,
  count,
  active,
  onClick,
  disabled,
}: FilterItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-muted",
      )}
    >
      <Icon
        className="size-4 shrink-0"
        weight={active ? "fill" : "regular"}
        aria-hidden
      />
      <span className="flex-1 text-left">{label}</span>
      <span
        className={cn(
          "text-xs tabular-nums",
          active ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}

export function TasksFiltersPanel({
  initialVisibility,
  initialStatus,
  counts,
}: {
  initialVisibility: TaskVisibility[];
  initialStatus: TaskStatus[];
  counts: TaskCounts;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function applyFilters({
    visibility,
    status,
  }: {
    visibility: TaskVisibility[];
    status: TaskStatus[];
  }) {
    const params = new URLSearchParams(searchParams.toString());
    if (visibility.length === 0) params.delete("visibility");
    else params.set("visibility", visibility.join(","));
    // status siempre permanece como key explícita para que el default
    // ("pending" cuando la key está ausente) no reaparezca si el usuario lo limpia.
    params.set("status", status.join(","));
    params.delete("taskId");
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/admin/tasks?${qs}` : "/admin/tasks");
    });
  }

  const hasActiveFilters =
    initialVisibility.length > 0 || initialStatus.length > 0;

  return (
    <div className={cn("space-y-6", isPending && "opacity-70")}>
      <div className="space-y-2">
        <div className="text-muted-foreground px-3 text-xs font-medium uppercase tracking-wide">
          Visibilidad
        </div>
        <nav className="space-y-1">
          {TASK_VISIBILITY_VALUES.map((v) => {
            const meta = VISIBILITY_META[v];
            return (
              <FilterItem
                key={v}
                label={meta.label}
                icon={meta.icon}
                count={counts.visibility[v]}
                active={initialVisibility.includes(v)}
                disabled={isPending}
                onClick={() =>
                  applyFilters({
                    visibility: toggleValue(initialVisibility, v),
                    status: initialStatus,
                  })
                }
              />
            );
          })}
        </nav>
      </div>

      <div className="space-y-2">
        <div className="text-muted-foreground px-3 text-xs font-medium uppercase tracking-wide">
          Estado
        </div>
        <nav className="space-y-1">
          {TASK_STATUS_VALUES.map((s) => {
            const meta = STATUS_META[s];
            return (
              <FilterItem
                key={s}
                label={meta.label}
                icon={meta.icon}
                count={counts.status[s]}
                active={initialStatus.includes(s)}
                disabled={isPending}
                onClick={() =>
                  applyFilters({
                    visibility: initialVisibility,
                    status: toggleValue(initialStatus, s),
                  })
                }
              />
            );
          })}
        </nav>
      </div>

      {hasActiveFilters ? (
        <div className="px-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => applyFilters({ visibility: [], status: [] })}
            disabled={isPending}
            className="w-full"
          >
            Limpiar filtros
          </Button>
        </div>
      ) : null}
    </div>
  );
}
