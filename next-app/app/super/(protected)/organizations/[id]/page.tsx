import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CaretLeftIcon,
  UserPlusIcon,
} from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { getOrganizationDetail } from "../actions";
import { InvitationsTable } from "./invitations-table";
import { MembersTable } from "./members-table";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getOrganizationDetail(id);
  return { title: `${detail?.name ?? "Organización"} — Edunet` };
}

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getOrganizationDetail(id);
  if (!detail) notFound();

  const hasAdmin = detail.members.some((m) => m.role === "admin");
  const pendingCount = detail.invitations.filter(
    (i) => i.status === "pending",
  ).length;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/super/organizations">
          <CaretLeftIcon />
          Volver a organizaciones
        </Link>
      </Button>

      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{detail.name}</h1>
          <p className="text-muted-foreground font-mono text-xs">
            {detail.slug}
          </p>
          <p className="text-muted-foreground text-sm">
            Creada el {dateFormatter.format(detail.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!hasAdmin ? <Badge variant="destructive">Sin admin</Badge> : null}
        </div>
      </header>

      <Tabs defaultValue={hasAdmin ? "members" : "invitations"}>
        <TabsList>
          <TabsTrigger value="members">
            Miembros ({detail.members.length})
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Invitaciones
            {pendingCount > 0 ? (
              <Badge variant="secondary" className="ml-2">
                {pendingCount}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <MembersTable members={detail.members} />
        </TabsContent>

        <TabsContent value="invitations" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" disabled>
              <UserPlusIcon />
              Nueva invitación (próximamente)
            </Button>
          </div>
          <InvitationsTable invitations={detail.invitations} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
