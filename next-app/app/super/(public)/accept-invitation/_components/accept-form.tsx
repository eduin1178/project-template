"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  acceptSuperInvitationEmailAction,
  type AcceptResult,
} from "../actions";

export function AcceptInvitationForm({
  token,
  invitedEmail,
}: {
  token: string;
  invitedEmail: string;
}) {
  const [state, formAction, isPending] = useActionState<
    AcceptResult | null,
    FormData
  >(acceptSuperInvitationEmailAction, null);

  const [googleError, setGoogleError] = useState<string | null>(null);

  async function onGoogle() {
    setGoogleError(null);
    await authClient.signIn.social({
      provider: "google",
      callbackURL: `/super/accept-invitation/complete?token=${encodeURIComponent(
        token,
      )}`,
    });
  }

  if (state?.ok) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            Tu cuenta quedó creada como super admin. Te enviamos un correo de
            verificación; ábrelo para iniciar sesión.
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
        <input type="hidden" name="token" value={token} />

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
      >
        Continuar con Google
      </Button>
    </div>
  );
}
