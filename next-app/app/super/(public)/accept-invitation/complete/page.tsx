import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { completeInvitationFromGoogleAction } from "../actions";

export const metadata = { title: "Finalizando invitación — Docentix" };
export const dynamic = "force-dynamic";

export default async function CompleteInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    redirect("/login");
  }

  const result = await completeInvitationFromGoogleAction(token!);

  if (result.ok) {
    redirect("/super");
  }

  return (
    <AuthCardLayout>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">
          No pudimos completar la invitación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{result.error}</AlertDescription>
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
