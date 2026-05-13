import { UsersIcon } from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { OrganizationMember } from "../actions";

const dateFormatter = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function MembersTable({ members }: { members: OrganizationMember[] }) {
  if (members.length === 0) {
    return (
      <EmptyState
        icon={<UsersIcon className="size-6" />}
        title="Aún no hay miembros"
        description="Cuando alguien acepte una invitación aparecerá aquí."
      />
    );
  }

  return (
    <div className="bg-card overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Se unió</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="font-medium">{m.name}</TableCell>
              <TableCell className="text-muted-foreground">{m.email}</TableCell>
              <TableCell>
                <Badge variant={m.role === "admin" ? "default" : "secondary"}>
                  {m.role}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {dateFormatter.format(m.joinedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
