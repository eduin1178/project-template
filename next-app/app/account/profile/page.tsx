import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";
import {
  countAccessMethods,
  hasCredentialAccount,
  hasProvider,
  listUserAccounts,
} from "@/lib/auth/account-queries";
import { Separator } from "@/components/ui/separator";

import { LinkedAccountsSection } from "./_components/linked-accounts-section";
import { PasswordSection } from "./_components/password-section";
import { ProfileForm } from "./_components/profile-form";

export const metadata = { title: "Mi perfil — Docentix" };

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  const accounts = await listUserAccounts(session.user.id);
  const hasPassword = hasCredentialAccount(accounts);
  const hasGoogle = hasProvider(accounts, "google");
  const totalMethods = countAccessMethods(accounts);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <header>
          <h2 className="text-xl font-semibold">Datos básicos</h2>
          <p className="text-muted-foreground text-sm">
            Actualiza tu nombre y avatar.
          </p>
        </header>
        <ProfileForm
          initialName={session.user.name ?? ""}
          initialImage={session.user.image ?? ""}
        />
      </section>

      <Separator />

      <section className="space-y-4">
        <header>
          <h2 className="text-xl font-semibold">Contraseña</h2>
          <p className="text-muted-foreground text-sm">
            {hasPassword
              ? "Cambia tu contraseña. Las demás sesiones se cerrarán."
              : "Aún no tienes una contraseña configurada."}
          </p>
        </header>
        <PasswordSection mode={hasPassword ? "change" : "set"} />
      </section>

      <Separator />

      <section className="space-y-4">
        <header>
          <h2 className="text-xl font-semibold">Cuentas vinculadas</h2>
          <p className="text-muted-foreground text-sm">
            Conecta o desconecta tus proveedores de acceso.
          </p>
        </header>
        <LinkedAccountsSection
          accounts={accounts.map((a) => ({
            providerId: a.providerId,
            accountId: a.accountId,
          }))}
          hasGoogle={hasGoogle}
          totalMethods={totalMethods}
        />
      </section>
    </div>
  );
}
