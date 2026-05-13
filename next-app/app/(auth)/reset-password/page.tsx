import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata = { title: "Define tu nueva contraseña — Edunet" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Define tu nueva contraseña</CardTitle>
          <CardDescription>
            Elige una contraseña segura para tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm token={token ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
