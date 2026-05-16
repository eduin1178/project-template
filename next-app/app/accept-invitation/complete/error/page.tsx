import Link from "next/link";

import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "No pudimos completar la invitación — Docentix" };
export const dynamic = "force-dynamic";

export default async function CompleteAcceptInvitationErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const { msg } = await searchParams;
  const message = msg ?? "Ocurrió un problema al completar la invitación.";

  return (
    <AuthCardLayout>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">
          No pudimos completar la invitación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button asChild>
            <Link href="/login">Ir a iniciar sesión</Link>
          </Button>
        </div>
      </CardContent>
    </AuthCardLayout>
  );
}
