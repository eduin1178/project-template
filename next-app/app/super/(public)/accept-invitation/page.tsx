import Link from "next/link";
import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { superInvitation } from "@/lib/db/schema";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { AcceptInvitationForm } from "./_components/accept-form";

export const metadata = { title: "Acepta tu invitación — Docentix" };
export const dynamic = "force-dynamic";

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return <InvalidInvitation />;
  }

  const [invitation] = await db
    .select()
    .from(superInvitation)
    .where(
      and(
        eq(superInvitation.token, token),
        isNull(superInvitation.acceptedAt),
        gt(superInvitation.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!invitation) {
    return <InvalidInvitation />;
  }

  return (
    <AuthCardLayout>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Acepta tu invitación</CardTitle>
        <CardDescription>
          Fuiste invitado como super admin de Docentix. Crea tu cuenta o
          ingresa con Google.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AcceptInvitationForm
          token={invitation.token}
          invitedEmail={invitation.invitedEmail}
        />
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
