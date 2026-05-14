import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { and, eq } from "drizzle-orm";

import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { invitation, member, organization, user } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { OrgAvatar } from "@/components/organizations/org-avatar";
import {
  MembersTable,
  type MemberRow,
} from "@/components/organizations/members-table";
import {
  InvitationsTable,
  type InvitationRow,
} from "@/components/organizations/invitations-table";

import { CreateInvitationDialog } from "./_components/create-invitation-dialog";
import { EditOrgDialog } from "./_components/edit-org-dialog";
import {
  deleteTenantInvitationAction,
  resendTenantInvitationAction,
  setMemberStatusAction,
  updateMemberRoleAction,
} from "./actions";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function decorateInvitations(
  rows: Array<{
    id: string;
    email: string;
    role: string | null;
    status: string;
    expiresAt: Date;
    createdAt: Date;
  }>,
): InvitationRow[] {
  const now = Date.now();
  return rows.map((row) => ({
    ...row,
    isExpired: row.expiresAt.getTime() <= now,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [org] = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, id))
    .limit(1);
  return { title: `${org?.name ?? "Organización"} — Docentix` };
}

export default async function AccountOrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const [membership] = await db
    .select({ role: member.role, status: member.status })
    .from(member)
    .where(and(eq(member.organizationId, id), eq(member.userId, session.user.id)))
    .limit(1);
  if (!membership) notFound();
  if (membership.status === "inactive") {
    redirect(`/account/suspended?org=${encodeURIComponent(id)}`);
  }

  const isAdmin = membership.role === "admin" || membership.role === "owner";

  const [org] = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
      createdAt: organization.createdAt,
    })
    .from(organization)
    .where(eq(organization.id, id))
    .limit(1);
  if (!org) notFound();

  const memberRows = await db
    .select({
      id: member.id,
      userId: member.userId,
      name: user.name,
      email: user.email,
      role: member.role,
      status: member.status,
      joinedAt: member.createdAt,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, id));

  const members: MemberRow[] = memberRows.map((m) => ({
    ...m,
    status: m.status === "inactive" ? "inactive" : "active",
  }));

  const inviteRows = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    })
    .from(invitation)
    .where(eq(invitation.organizationId, id));

  const invitations: InvitationRow[] = decorateInvitations(inviteRows);
  const pendingCount = invitations.filter(
    (i) => i.status === "pending" && !i.isExpired,
  ).length;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/account/organizations">
          <CaretLeftIcon />
          Volver a mis organizaciones
        </Link>
      </Button>

      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <OrgAvatar name={org.name} logo={org.logo} className="size-14" />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">{org.name}</h1>
            <p className="text-muted-foreground font-mono text-xs">{org.slug}</p>
            <p className="text-muted-foreground text-sm">
              Creada el {dateFormatter.format(org.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isAdmin ? "default" : "secondary"}>
            {isAdmin ? "Admin" : "Miembro"}
          </Badge>
          {isAdmin ? (
            <EditOrgDialog
              organizationId={org.id}
              slug={org.slug}
              initialName={org.name}
              currentLogo={org.logo}
            />
          ) : null}
        </div>
      </header>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">
            Miembros ({members.length})
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
          <MembersTable
            members={members}
            currentUserId={session.user.id}
            canManage={isAdmin}
            actions={
              isAdmin
                ? {
                    onChangeRole: updateMemberRoleAction,
                    onSetStatus: setMemberStatusAction,
                  }
                : undefined
            }
          />
        </TabsContent>

        <TabsContent value="invitations" className="mt-4 space-y-4">
          {isAdmin ? (
            <div className="flex justify-end">
              <CreateInvitationDialog organizationId={org.id} />
            </div>
          ) : null}
          <InvitationsTable
            invitations={invitations}
            canManage={isAdmin}
            onResend={isAdmin ? resendTenantInvitationAction : undefined}
            onDelete={isAdmin ? deleteTenantInvitationAction : undefined}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
