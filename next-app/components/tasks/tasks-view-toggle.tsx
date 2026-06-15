"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KanbanIcon, SquaresFourIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
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

  return (
    <div
      className="border-border bg-muted/40 inline-flex rounded-full border p-1"
      aria-label="Modo de visualización"
    >
      <Button
        asChild
        size="sm"
        variant={viewMode === "board" ? "secondary" : "ghost"}
        className="h-8 rounded-full px-3"
      >
        <Link href={buildHref({ basePath, searchParams, view: "board" })}>
          <KanbanIcon />
          Tablero
        </Link>
      </Button>
      <Button
        asChild
        size="sm"
        variant={viewMode === "cards" ? "secondary" : "ghost"}
        className="h-8 rounded-full px-3"
      >
        <Link href={buildHref({ basePath, searchParams, view: "cards" })}>
          <SquaresFourIcon />
          Tarjetas
        </Link>
      </Button>
    </div>
  );
}
