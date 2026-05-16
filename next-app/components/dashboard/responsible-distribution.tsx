import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/tasks/user-avatar";

import type { ResponsibleRow } from "@/lib/dashboard/queries";

export function ResponsibleDistribution({
  rows,
}: {
  rows: ResponsibleRow[];
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">Distribución por responsable</CardTitle>
        <p className="text-muted-foreground text-xs">
          Top 5 responsables con tareas pendientes o en curso.
        </p>
      </CardHeader>
      <CardContent className="px-4">
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Aún no hay tareas asignadas a un responsable.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {rows.map((row) => (
              <li
                key={row.userId}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar
                    name={row.name}
                    email={row.email}
                    image={row.image}
                    className="size-9"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {row.name?.trim() || row.email?.trim() || "Sin nombre"}
                    </p>
                    {row.email ? (
                      <p className="text-muted-foreground truncate text-xs">
                        {row.email}
                      </p>
                    ) : null}
                  </div>
                </div>
                <Badge variant="secondary">{row.openCount} abiertas</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
