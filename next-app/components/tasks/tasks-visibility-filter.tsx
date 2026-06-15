"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  ArchiveIcon,
  CaretDownIcon,
  FileDashedIcon,
  LightningIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TASK_VISIBILITY_VALUES,
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

function toggleValue<T extends string>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((v) => v !== value)
    : [...values, value];
}

function visibilitySummary(values: TaskVisibility[]): string {
  if (values.length === 0) return "Todas";
  if (values.length === 1) return VISIBILITY_META[values[0]].label;
  return `${values.length} seleccionadas`;
}

export function TasksVisibilityFilter({
  initialVisibility,
  counts,
  basePath,
  activeCount,
}: {
  initialVisibility: TaskVisibility[];
  counts: TaskCounts;
  basePath: string;
  activeCount: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function applyVisibility(visibility: TaskVisibility[]) {
    const params = new URLSearchParams(searchParams.toString());
    if (visibility.length === 0) params.delete("visibility");
    else params.set("visibility", visibility.join(","));
    params.delete("taskId");

    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${basePath}?${qs}` : basePath);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label="Filtrar por visibilidad"
          className={cn(isPending && "opacity-70")}
        >
          Visibilidad: {visibilitySummary(initialVisibility)}
          {activeCount > 0 ? (
            <Badge variant="secondary" className="ml-1">
              {activeCount}
            </Badge>
          ) : null}
          <CaretDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Visibilidad</DropdownMenuLabel>
        {TASK_VISIBILITY_VALUES.map((visibility) => {
          const meta = VISIBILITY_META[visibility];
          const Icon = meta.icon;

          return (
            <DropdownMenuCheckboxItem
              key={visibility}
              checked={initialVisibility.includes(visibility)}
              disabled={isPending}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={() =>
                applyVisibility(toggleValue(initialVisibility, visibility))
              }
            >
              <Icon />
              <span className="flex-1">{meta.label}</span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {counts.visibility[visibility]}
              </span>
            </DropdownMenuCheckboxItem>
          );
        })}
        {initialVisibility.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isPending}
              onSelect={(event) => {
                event.preventDefault();
                applyVisibility([]);
              }}
            >
              Limpiar visibilidad
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
