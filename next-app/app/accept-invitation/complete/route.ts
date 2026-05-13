import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { invitation, member } from "@/lib/db/schema";

const PENDING_COOKIE = "pending-invitation-id";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const jar = await cookies();
  const invitationId = jar.get(PENDING_COOKIE)?.value ?? null;
  if (invitationId) {
    jar.delete(PENDING_COOKIE);
  }
  if (!invitationId) {
    return errorRedirect(
      url,
      "No encontramos la invitación. Vuelve a abrir el link del correo.",
    );
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return errorRedirect(
      url,
      "No detectamos tu sesión. Intenta nuevamente.",
    );
  }

  const [row] = await db
    .select()
    .from(invitation)
    .where(
      and(
        eq(invitation.id, invitationId),
        eq(invitation.status, "pending"),
        gt(invitation.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!row) {
    return errorRedirect(url, "La invitación ya no está disponible.");
  }

  try {
    await db.transaction(async (tx) => {
      const updated = await tx
        .update(invitation)
        .set({ status: "accepted" })
        .where(
          and(
            eq(invitation.id, invitationId),
            eq(invitation.status, "pending"),
          ),
        )
        .returning({ id: invitation.id });
      if (updated.length === 0) throw new Error("RACE");

      await tx.insert(member).values({
        id: randomUUID(),
        organizationId: row.organizationId,
        userId: session.user.id,
        role: row.role ?? "admin",
        createdAt: new Date(),
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "RACE") {
      return errorRedirect(url, "La invitación ya fue usada.");
    }
    console.error("[accept-org/complete] error", err);
    return errorRedirect(url, "No pudimos completar la aceptación.");
  }

  return NextResponse.redirect(new URL("/admin", url.origin));
}

function errorRedirect(currentUrl: URL, message: string) {
  const target = new URL("/accept-invitation/complete/error", currentUrl.origin);
  target.searchParams.set("msg", message);
  return NextResponse.redirect(target);
}
