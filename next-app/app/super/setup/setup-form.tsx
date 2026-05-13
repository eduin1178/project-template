"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  bootstrapFirstSuperAdminAction,
  type SetupResult,
} from "./actions";

export function SetupForm() {
  const [state, formAction, isPending] = useActionState<
    SetupResult | null,
    FormData
  >(bootstrapFirstSuperAdminAction, null);

  if (state?.ok) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            Cuenta creada. Te enviamos un correo de verificación. Ábrelo para
            poder iniciar sesión.
          </AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <Link href="/login">Ir a iniciar sesión</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
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

      <div className="space-y-2">
        <Label htmlFor="setupToken">Token de setup</Label>
        <Input
          id="setupToken"
          name="setupToken"
          type="password"
          required
          autoComplete="off"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creando…" : "Crear super admin"}
      </Button>
    </form>
  );
}
