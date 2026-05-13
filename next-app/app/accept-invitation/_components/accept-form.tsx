"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";

import { authClient } from "@/lib/auth/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  acceptOrgInvitationEmailAction,
  setPendingInvitationCookieAction,
  type AcceptResult,
} from "../actions";

export function AcceptOrgInvitationForm({
  invitationId,
  invitedEmail,
}: {
  invitationId: string;
  invitedEmail: string;
}) {
  const [state, formAction, isPending] = useActionState<
    AcceptResult | null,
    FormData
  >(acceptOrgInvitationEmailAction, null);

  const [isGooglePending, startGoogle] = useTransition();
  const [googleError, setGoogleError] = useState<string | null>(null);

  function onGoogle() {
    setGoogleError(null);
    startGoogle(async () => {
      try {
        await setPendingInvitationCookieAction(invitationId);
        await authClient.signIn.social({
          provider: "google",
          callbackURL: "/accept-invitation/complete",
        });
      } catch {
        setGoogleError("No pudimos iniciar el flujo de Google. Intenta de nuevo.");
      }
    });
  }

  if (state?.ok) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            Tu cuenta quedó creada. Te enviamos un correo de verificación; al
            confirmarlo podrás iniciar sesión en tu organización.
          </AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <Link href="/login">Ir a iniciar sesión</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="invitationId" value={invitationId} />

        {state && !state.ok ? (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="name">Nombre completo</Label>
          <Input id="name" name="name" required autoComplete="name" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={invitedEmail}
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Creando…" : "Crear cuenta"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background text-muted-foreground px-2">
            o continúa con
          </span>
        </div>
      </div>

      {googleError ? (
        <Alert variant="destructive">
          <AlertDescription>{googleError}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onGoogle}
        disabled={isGooglePending}
      >
        {isGooglePending ? "Redirigiendo…" : "Continuar con Google"}
      </Button>
    </div>
  );
}
