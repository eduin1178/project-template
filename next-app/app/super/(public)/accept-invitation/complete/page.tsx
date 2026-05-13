import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { completeInvitationFromGoogleAction } from "../actions";

export const metadata = { title: "Finalizando invitación — Edunet" };
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
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-semibold">No pudimos completar la invitación</h1>
        <Alert variant="destructive">
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
        <Button asChild>
          <Link href="/login">Ir a iniciar sesión</Link>
        </Button>
      </div>
    </div>
  );
}
