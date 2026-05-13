import { PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/ssr";

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

import {
  InvitationRowActions,
  type ActionResult,
} from "./invitation-row-actions";

export type InvitationRow = {
  id: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  isExpired: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function statusVariant(status: string) {
  switch (status) {
    case "accepted":
      return "default" as const;
    case "pending":
      return "secondary" as const;
    case "expired":
    case "rejected":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "accepted":
      return "Aceptada";
    case "pending":
      return "Pendiente";
    case "expired":
      return "Expirada";
    case "rejected":
      return "Rechazada";
    default:
      return status;
  }
}

function roleLabel(role: string | null) {
  if (role === "admin" || role === "owner") return "Admin";
  if (role === "member") return "Miembro";
  return role ?? "—";
}

export function InvitationsTable({
  invitations,
  canManage,
  onResend,
  onDelete,
}: {
  invitations: InvitationRow[];
  canManage: boolean;
  onResend?: (id: string) => Promise<ActionResult>;
  onDelete?: (id: string) => Promise<ActionResult>;
}) {
  if (invitations.length === 0) {
    return (
      <EmptyState
        icon={<PaperPlaneTiltIcon className="size-6" />}
        title="Sin invitaciones"
        description="No hay invitaciones para esta organización."
      />
    );
  }

  return (
    <div className="bg-card overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Expira</TableHead>
            {canManage ? (
              <TableHead className="text-right">Acciones</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((inv) => {
            const isExpired = inv.status === "pending" && inv.isExpired;
            const displayStatus = isExpired ? "expired" : inv.status;
            return (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.email}</TableCell>
                <TableCell className="text-muted-foreground">
                  {roleLabel(inv.role)}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(displayStatus)}>
                    {statusLabel(displayStatus)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {dateFormatter.format(inv.expiresAt)}
                </TableCell>
                {canManage && onResend && onDelete ? (
                  <TableCell className="text-right">
                    <InvitationRowActions
                      invitationId={inv.id}
                      status={displayStatus}
                      onResend={onResend}
                      onDelete={onDelete}
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
