import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { BuildingsIcon } from "@phosphor-icons/react/dist/ssr";

import { AppShell } from "@/components/layout/app-shell";
import { buildAccountFallbackSidebarConfig } from "@/components/layout/contexts/account";
import { switchActiveOrganizationAction } from "@/components/layout/team-switcher-actions";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth/server";
import { loadActiveMembershipsFor } from "@/lib/auth/guards";
import { deriveMenuRole } from "@/lib/auth/role-menu";

export const metadata = { title: "Sin institución — Docentix" };

export default async function NoOrganizationPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login?next=/no-organization");
  }

  const memberships = await loadActiveMembershipsFor(session.user.id);
  if (memberships.length > 0) {
    redirect("/post-login");
  }

  return (
    <AppShell
      sidebarConfig={buildAccountFallbackSidebarConfig()}
      user={{
        name: session.user.name ?? session.user.email,
        email: session.user.email,
        image: session.user.image ?? null,
      }}
      role={deriveMenuRole(session, memberships)}
      teams={{
        orgs: [],
        activeOrgId: null,
        onSwitch: switchActiveOrganizationAction,
      }}
      headerLabel="Sin institución"
    >
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 py-12 text-center">
        <div className="bg-muted text-muted-foreground flex size-16 items-center justify-center rounded-full">
          <BuildingsIcon className="size-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">
            No perteneces a ninguna institución
          </h1>
          <p className="text-muted-foreground text-sm">
            Tu cuenta está activa, pero todavía no eres miembro de una
            institución. Si recibiste una invitación, puedes aceptarla desde
            tus invitaciones pendientes. Si no, contacta al administrador de
            tu institución para que te invite.
          </p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Button asChild>
            <Link href="/account/invitations">Ver mis invitaciones</Link>
          </Button>
          <Button asChild variant="link">
            <Link href="/account/profile">Ir a mi perfil</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
