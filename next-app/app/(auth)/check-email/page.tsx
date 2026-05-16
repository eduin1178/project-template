import Link from "next/link";

import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Revisa tu correo — Docentix" };

export default function CheckEmailPage() {
  return (
    <AuthCardLayout>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Te enviamos un correo</CardTitle>
        <CardDescription>
          Revisa tu bandeja de entrada y abre el enlace de verificación para
          activar tu cuenta. Si no lo encuentras, revisa la carpeta de spam.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button asChild>
          <Link href="/login">Ir a iniciar sesión</Link>
        </Button>
      </CardContent>
    </AuthCardLayout>
  );
}
