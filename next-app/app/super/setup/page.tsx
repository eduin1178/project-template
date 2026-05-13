import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { user } from "@/lib/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { SetupForm } from "./setup-form";

void eq;

export const metadata = { title: "Configura el primer super admin — Docentix" };
export const dynamic = "force-dynamic";

export default async function SuperSetupPage() {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(user)
    .where(sql`${user.role} = 'super_admin'`);

  if ((count ?? 0) > 0) {
    notFound();
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Configura el primer super admin</CardTitle>
          <CardDescription>
            Crea la cuenta inicial de la plataforma. Necesitarás el token de
            setup (`SUPER_ADMIN_SETUP_TOKEN`).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SetupForm />
        </CardContent>
      </Card>
    </div>
  );
}
