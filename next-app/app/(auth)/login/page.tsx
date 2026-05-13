import { redirect } from "next/navigation";

import { getCurrentSession, redirectToDashboard } from "@/lib/auth/guards";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { LoginForm } from "./login-form";

export const metadata = {
  title: "Iniciar sesión — Edunet",
};

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session?.user) {
    await redirectToDashboard();
  }
  // Evita warning de unused redirect import en lints estrictos.
  void redirect;

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Inicia sesión</CardTitle>
          <CardDescription>
            Accede con tu correo institucional o cuenta de Google.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
