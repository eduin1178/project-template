import { redirect } from "next/navigation";

import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { getCurrentSession, redirectToDashboard } from "@/lib/auth/guards";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { LoginForm } from "./login-form";

export const metadata = {
  title: "Iniciar sesión — Docentix",
};

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session?.user) {
    await redirectToDashboard();
  }
  // Evita warning de unused redirect import en lints estrictos.
  void redirect;

  return (
    <AuthCardLayout>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Inicia sesión</CardTitle>
        <CardDescription>
          Accede con tu correo institucional o cuenta de Google.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </AuthCardLayout>
  );
}
