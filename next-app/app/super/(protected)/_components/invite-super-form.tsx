"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  createSuperInvitationAction,
  type InviteResult,
} from "../../actions";

export function InviteSuperForm() {
  const [state, formAction, isPending] = useActionState<
    InviteResult | null,
    FormData
  >(createSuperInvitationAction, null);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="invite-email">Correo del invitado</Label>
        <Input
          id="invite-email"
          name="email"
          type="email"
          required
          placeholder="persona@institucion.com"
        />
      </div>

      {state?.ok === true ? (
        <Alert>
          <AlertDescription>Invitación enviada.</AlertDescription>
        </Alert>
      ) : null}
      {state && !state.ok ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Enviando…" : "Enviar invitación"}
      </Button>
    </form>
  );
}
