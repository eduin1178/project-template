import Link from "next/link";
import { headers } from "next/headers";
import { permanentRedirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";

import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { invitation, organization } from "@/lib/db/schema";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { AcceptOrgInvitationForm } from "./_components/accept-form";
import { AcceptLoggedIn } from "./_components/accept-logged-in";

export const metadata = { title: "Acepta tu invitación — Docentix" };
export const dynamic = "force-dynamic";

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; invitationId?: string }>;
}) {
  const { token, invitationId } = await searchParams;

  if (token && !invitationId) {
    permanentRedirect(
      `/super/accept-invitation?token=${encodeURIComponent(token)}`,
    );
  }

  if (!invitationId) {
    return <InvalidInvitation />;
  }

  const [row] = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      role: invitation.role,
      organizationId: invitation.organizationId,
      organizationName: organization.name,
    })
    .from(invitation)
    .leftJoin(organization, eq(invitation.organizationId, organization.id))
    .where(
      and(
        eq(invitation.id, invitationId),
        eq(invitation.status, "pending"),
        gt(invitation.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) {
    return <InvalidInvitation />;
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const orgName = row.organizationName ?? "tu institución";

  return (
    <AuthCardLayout>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Acepta tu invitación</CardTitle>
        <CardDescription>
          Fuiste invitado a administrar <strong>{orgName}</strong> en Docentix.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {session?.user ? (
          <AcceptLoggedIn
            invitationId={row.id}
            currentEmail={session.user.email}
          />
        ) : (
          <AcceptOrgInvitationForm
            invitationId={row.id}
            invitedEmail={row.email}
          />
        )}
      </CardContent>
    </AuthCardLayout>
  );
}

function InvalidInvitation() {
  return (
    <AuthCardLayout>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Invitación no válida</CardTitle>
        <CardDescription>
          El enlace que abriste expiró, ya fue usado o no es válido. Solicita
          una nueva invitación a tu contacto en Docentix.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button asChild>
          <Link href="/login">Ir a iniciar sesión</Link>
        </Button>
      </CardContent>
    </AuthCardLayout>
  );
}
