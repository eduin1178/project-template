import { headers } from "next/headers";
import { and, gt, isNull } from "drizzle-orm";

import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { superInvitation } from "@/lib/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { InviteSuperForm } from "./_components/invite-super-form";
import { PendingInvitations } from "./_components/pending-invitations";

export const metadata = { title: "Panel super — Edunet" };

export default async function SuperDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  const pending = await db
    .select()
    .from(superInvitation)
    .where(
      and(isNull(superInvitation.acceptedAt), gt(superInvitation.expiresAt, new Date())),
    );

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold">
          Hola, {session?.user.name ?? session?.user.email}
        </h1>
        <p className="text-muted-foreground mt-2">
          Este es tu panel de control general de la plataforma. Desde acá podrás
          administrar instituciones, usuarios super y operaciones internas.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invitar a otro super admin</CardTitle>
            <CardDescription>
              Enviaremos un enlace de invitación al correo indicado. El enlace
              expira en 7 días.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteSuperForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invitaciones pendientes</CardTitle>
            <CardDescription>
              Invitaciones aún no aceptadas y no vencidas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PendingInvitations invitations={pending} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <PlaceholderCard
          title="Instituciones"
          description="Listar y administrar tenants (próximamente)."
        />
        <PlaceholderCard
          title="Usuarios"
          description="Vista transversal de usuarios (próximamente)."
        />
        <PlaceholderCard
          title="Operaciones"
          description="Soporte, métricas y auditoría (próximamente)."
        />
      </section>
    </div>
  );
}

function PlaceholderCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="opacity-70">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
