import { redirect } from "next/navigation";

import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth/server";

export const metadata = { title: "Verificación de correo — Docentix" };

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
    <AuthCardLayout>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Verifica tu correo</CardTitle>
        <CardDescription>
          Abre el enlace que te enviamos por correo para activar tu cuenta.
        </CardDescription>
      </CardHeader>
      <CardContent />
    </AuthCardLayout>
  );
}
