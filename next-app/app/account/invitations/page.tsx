import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, sql } from "drizzle-orm";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr";

import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { invitation, organization } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Invitaciones — Docentix" };

function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function roleLabel(role: string | null): string {
  if (role === "admin" || role === "owner") return "Admin";
  return "Miembro";
}

export default async function InvitationsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  const email = session.user.email.toLowerCase();
  const rows = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      organizationLogo: organization.logo,
    })
    .from(invitation)
    .innerJoin(organization, eq(organization.id, invitation.organizationId))
    .where(
      and(
        eq(sql`LOWER(${invitation.email})`, email),
        eq(invitation.status, "pending"),
        gt(invitation.expiresAt, new Date()),
      ),
    )
    .orderBy(invitation.createdAt);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold">Invitaciones</h2>
        <p className="text-muted-foreground text-sm">
          Invitaciones pendientes recibidas en tu correo.
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          icon={<EnvelopeSimpleIcon className="size-6" />}
          title="No tienes invitaciones pendientes"
          description="Cuando alguien te invite a una organización, aparecerá aquí."
        />
      ) : (
        <ul className="divide-border divide-y rounded-md border">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-4 p-4"
            >
              <div className="bg-muted flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md text-sm font-medium">
                {row.organizationLogo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={row.organizationLogo}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  row.organizationName.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {row.organizationName}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  Rol: {roleLabel(row.role)} · Expira el {formatDate(row.expiresAt)}
                </p>
              </div>
              <Button asChild size="sm">
                <Link href={`/accept-invitation?invitationId=${row.id}`}>
                  Ver invitación
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
