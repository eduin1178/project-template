import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";

export const metadata = { title: "Verificación de correo — Edunet" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; callbackURL?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    redirect("/login");
  }

  // better-auth maneja la verificación cuando se abre el enlace que él envía
  // (la URL apunta directamente al endpoint). Esta página existe como destino
  // de fallback con mensaje claro si llegan por otra ruta.
  void auth;

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Verifica tu correo</h1>
        <p className="text-muted-foreground mt-2">
          Abre el enlace que te enviamos por correo para activar tu cuenta.
        </p>
      </div>
    </div>
  );
}
