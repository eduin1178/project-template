"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CaretDownIcon,
  CheckIcon,
  KanbanIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TaskListViewMode } from "@/lib/tasks/route-data";

function buildHref({
  basePath,
  searchParams,
  view,
}: {
  basePath: string;
  searchParams: URLSearchParams;
  view: TaskListViewMode;
}): string {
  const params = new URLSearchParams(searchParams.toString());
  params.set("view", view);
  params.delete("taskId");
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function TasksViewToggle({
  basePath,
  viewMode,
}: {
  basePath: string;
  viewMode: TaskListViewMode;
}) {
  const searchParams = useSearchParams();
  const current =
    viewMode === "board"
      ? { label: "Tablero", icon: KanbanIcon }
      : { label: "Tarjetas", icon: SquaresFourIcon };
  const CurrentIcon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label="Elegir modo de visualización"
        >
          <CurrentIcon />
          Vista: {current.label}
          <CaretDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={buildHref({ basePath, searchParams, view: "board" })}>
            <KanbanIcon />
            <span className="flex-1">Tablero</span>
            {viewMode === "board" ? <CheckIcon /> : null}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={buildHref({ basePath, searchParams, view: "cards" })}>
            <SquaresFourIcon />
            <span className="flex-1">Tarjetas</span>
            {viewMode === "cards" ? <CheckIcon /> : null}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
