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

export type MemberRow = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: Date;
};

const dateFormatter = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function roleLabel(role: string) {
  if (role === "admin" || role === "owner") return "Admin";
  return "Miembro";
}

export function MembersTable({
  members,
  currentUserId,
}: {
  members: MemberRow[];
  currentUserId?: string;
}) {
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
          {members.map((m) => {
            const isYou = currentUserId && m.userId === currentUserId;
            return (
              <TableRow key={m.id}>
                <TableCell className="font-medium">
                  {m.name}
                  {isYou ? (
                    <span className="text-muted-foreground ml-2 text-xs">
                      (tú)
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {m.email}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      m.role === "admin" || m.role === "owner"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {roleLabel(m.role)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {dateFormatter.format(m.joinedAt)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
