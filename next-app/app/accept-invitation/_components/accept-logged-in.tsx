"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { acceptOrgInvitationLoggedIn } from "../actions";

export function AcceptLoggedIn({
  invitationId,
  currentEmail,
}: {
  invitationId: string;
  currentEmail: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onAccept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptOrgInvitationLoggedIn(invitationId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/admin");
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Estás autenticado como <strong>{currentEmail}</strong>. Al aceptar
        quedarás vinculado como administrador de la organización.
      </p>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button onClick={onAccept} disabled={isPending} className="w-full">
        {isPending ? "Aceptando…" : "Aceptar invitación"}
      </Button>
    </div>
  );
}
