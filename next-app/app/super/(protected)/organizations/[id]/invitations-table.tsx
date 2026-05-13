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

import type { OrganizationInvitation } from "../actions";
import { InvitationRowActions } from "./invitation-row-actions";

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

export function InvitationsTable({
  invitations,
}: {
  invitations: OrganizationInvitation[];
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
            <TableHead className="text-right">Acciones</TableHead>
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
                  {inv.role ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(displayStatus)}>
                    {statusLabel(displayStatus)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {dateFormatter.format(inv.expiresAt)}
                </TableCell>
                <TableCell className="text-right">
                  <InvitationRowActions
                    invitationId={inv.id}
                    status={displayStatus}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
