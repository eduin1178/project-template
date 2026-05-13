import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { BuildingsIcon } from "@phosphor-icons/react/dist/ssr";

import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { member, organization } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Mis organizaciones — Edunet" };

function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function OrganizationsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "super_admin") {
    return (
      <div className="space-y-6">
        <header>
          <h2 className="text-xl font-semibold">Mis organizaciones</h2>
        </header>
        <EmptyState
          icon={<BuildingsIcon className="size-6" />}
          title="Esta sección no aplica para super administradores"
          description="Como super administrador no perteneces a organizaciones; las gestionas desde el panel super."
          action={
            <Button asChild>
              <Link href="/super">Ir al panel super</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const rows = await db
    .select({
      organizationId: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
      role: member.role,
      joinedAt: member.createdAt,
    })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(eq(member.userId, session.user.id))
    .orderBy(organization.name);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold">Mis organizaciones</h2>
        <p className="text-muted-foreground text-sm">
          Organizaciones en las que participas.
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          icon={<BuildingsIcon className="size-6" />}
          title="No perteneces a ninguna organización"
          description="Cuando aceptes una invitación, aparecerá aquí."
        />
      ) : (
        <ul className="divide-border divide-y rounded-md border">
          {rows.map((row) => {
            const isAdmin = row.role === "admin" || row.role === "owner";
            return (
              <li key={row.organizationId} className="flex items-center gap-4 p-4">
                <div className="bg-muted flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md text-sm font-medium">
                  {row.logo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={row.logo}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    row.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/account/organizations/${row.organizationId}`}
                      className="hover:underline truncate text-sm font-medium"
                    >
                      {row.name}
                    </Link>
                    {isAdmin ? <Badge variant="secondary">Admin</Badge> : null}
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    {row.slug} · Miembro desde {formatDate(row.joinedAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
