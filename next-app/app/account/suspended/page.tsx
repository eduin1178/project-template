import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr";

import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { organization } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Acceso suspendido — Docentix" };
export const dynamic = "force-dynamic";

export default async function AccessSuspendedPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  const { org: orgId } = await searchParams;
  let orgName = "una organización";
  if (orgId) {
    const [org] = await db
      .select({ name: organization.name })
      .from(organization)
      .where(eq(organization.id, orgId))
      .limit(1);
    if (org) orgName = org.name;
  }

  return (
    <div className="bg-background flex min-h-[60vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="bg-destructive/10 text-destructive mx-auto mb-3 flex size-12 items-center justify-center rounded-full">
            <WarningIcon weight="bold" className="size-6" />
          </div>
          <CardTitle className="text-2xl">Acceso suspendido</CardTitle>
          <CardDescription>
            Tu acceso a <strong>{orgName}</strong> fue suspendido. Contacta al
            administrador de la organización para reactivarlo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/account/organizations">Volver a mis organizaciones</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
