import Link from "next/link";
import { redirect } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { completeOrgInvitationFromGoogleAction } from "../actions";

export const metadata = { title: "Finalizando invitación — Edunet" };
export const dynamic = "force-dynamic";

export default async function CompleteAcceptInvitationPage() {
  const result = await completeOrgInvitationFromGoogleAction();

  if (result.ok) {
    redirect("/admin");
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
