import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = { title: "Recupera tu contraseña — Edunet" };

export default function ForgotPasswordPage() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Recupera tu contraseña</CardTitle>
          <CardDescription>
            Te enviaremos un enlace para restablecerla.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
