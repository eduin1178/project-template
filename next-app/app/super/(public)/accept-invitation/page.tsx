import Link from "next/link";
import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { superInvitation } from "@/lib/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { AcceptInvitationForm } from "./_components/accept-form";

export const metadata = { title: "Acepta tu invitación — Edunet" };
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
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Acepta tu invitación</CardTitle>
          <CardDescription>
            Fuiste invitado como super admin de Edunet. Crea tu cuenta o ingresa
            con Google.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcceptInvitationForm
            token={invitation.token}
            invitedEmail={invitation.invitedEmail}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function InvalidInvitation() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-semibold">Invitación no válida</h1>
        <p className="text-muted-foreground">
          El enlace que abriste expiró, ya fue usado o no es válido. Solicita
          una nueva invitación a tu contacto en Edunet.
        </p>
        <Button asChild>
          <Link href="/login">Ir a iniciar sesión</Link>
        </Button>
      </div>
    </div>
  );
}
