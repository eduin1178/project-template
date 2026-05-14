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

import { MemberRowActions } from "./member-row-actions";

type ActionResult = { ok: true } | { ok: false; error: string };

export type MemberRow = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
  joinedAt: Date;
};

export type MembersTableActions = {
  onChangeRole: (input: {
    memberId: string;
    role: "admin" | "member";
  }) => Promise<ActionResult>;
  onSetStatus: (input: {
    memberId: string;
    status: "active" | "inactive";
  }) => Promise<ActionResult>;
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

function isPrivileged(role: string) {
  return role === "admin" || role === "owner";
}

export function MembersTable({
  members,
  currentUserId,
  canManage = false,
  actions,
}: {
  members: MemberRow[];
  currentUserId?: string;
  canManage?: boolean;
  actions?: MembersTableActions;
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

  const showActions = canManage && Boolean(actions);
  const activeAdminCount = members.filter(
    (m) => m.status === "active" && isPrivileged(m.role),
  ).length;

  return (
    <div className="bg-card overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Se unió</TableHead>
            {showActions ? (
              <TableHead className="w-12 text-right" />
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => {
            const isYou = currentUserId && m.userId === currentUserId;
            const isLastActiveAdmin =
              m.status === "active" &&
              isPrivileged(m.role) &&
              activeAdminCount === 1;
            const isInactive = m.status === "inactive";
            return (
              <TableRow
                key={m.id}
                className={isInactive ? "opacity-60" : undefined}
              >
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
                    variant={isPrivileged(m.role) ? "default" : "secondary"}
                  >
                    {roleLabel(m.role)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={isInactive ? "destructive" : "secondary"}
                  >
                    {isInactive ? "Suspendido" : "Activo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {dateFormatter.format(m.joinedAt)}
                </TableCell>
                {showActions ? (
                  <TableCell className="text-right">
                    <MemberRowActions
                      memberId={m.id}
                      memberName={m.name}
                      isSelf={Boolean(isYou)}
                      role={m.role}
                      status={m.status}
                      isLastActiveAdmin={isLastActiveAdmin}
                      onChangeRole={actions!.onChangeRole}
                      onSetStatus={actions!.onSetStatus}
                    />
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
