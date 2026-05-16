import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { TopTaskRow } from "@/lib/dashboard/queries";

function formatDueAt(dueAt: Date | null): string {
  if (!dueAt) return "Sin fecha";
  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(dueAt);
}

type TopTasksListProps = {
  title: string;
  tasks: TopTaskRow[];
  hrefBuilder: (id: string) => string;
  emptyMessage: string;
};

export function TopTasksList({
  title,
  tasks,
  hrefBuilder,
  emptyMessage,
}: TopTasksListProps) {
  return (
    <Card size="sm" className="h-full">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        {tasks.length === 0 ? (
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        ) : (
          <ul className="divide-border divide-y">
            {tasks.map((task) => (
              <li key={task.id}>
                <Link
                  href={hrefBuilder(task.id)}
                  className="group flex items-center justify-between gap-3 py-3 transition-colors hover:text-foreground"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="text-muted-foreground text-xs">
                      Vence: {formatDueAt(task.dueAt)}
                    </p>
                  </div>
                  <CaretRight
                    size={16}
                    className="text-muted-foreground group-hover:text-foreground shrink-0"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
