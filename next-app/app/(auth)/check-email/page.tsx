import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata = { title: "Revisa tu correo — Docentix" };

export default function CheckEmailPage() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-semibold">Te enviamos un correo</h1>
        <p className="text-muted-foreground">
          Revisa tu bandeja de entrada y abre el enlace de verificación para
          activar tu cuenta. Si no lo encuentras, revisa la carpeta de spam.
        </p>
        <Button asChild>
          <Link href="/login">Ir a iniciar sesión</Link>
        </Button>
      </div>
    </div>
  );
}
