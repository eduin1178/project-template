import type { SuperInvitation } from "@/lib/db/schema/super-invitation";

const formatter = new Intl.DateTimeFormat("es", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function PendingInvitations({
  invitations,
}: {
  invitations: SuperInvitation[];
}) {
  if (invitations.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No hay invitaciones pendientes.
      </p>
    );
  }

  return (
    <ul className="space-y-2 text-sm">
      {invitations.map((inv) => (
        <li
          key={inv.id}
          className="bg-muted/40 flex items-center justify-between rounded-md px-3 py-2"
        >
          <span>{inv.invitedEmail}</span>
          <span className="text-muted-foreground text-xs">
            Vence {formatter.format(inv.expiresAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}
