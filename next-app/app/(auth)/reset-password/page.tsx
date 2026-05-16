import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata = { title: "Define tu nueva contraseña — Docentix" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthCardLayout>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Define tu nueva contraseña</CardTitle>
        <CardDescription>
          Elige una contraseña segura para tu cuenta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm token={token ?? ""} />
      </CardContent>
    </AuthCardLayout>
  );
}
