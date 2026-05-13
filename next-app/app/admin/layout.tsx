import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/lib/auth/server";
import { loadMembershipsFor } from "@/lib/auth/guards";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role === "super_admin") {
    redirect("/super");
  }
  const memberships = await loadMembershipsFor(session.user.id);
  const isAdmin = memberships.some(
    (m) => m.role === "admin" || m.role === "owner",
  );
  if (!isAdmin) {
    redirect("/app");
  }
  return <div className="min-h-screen">{children}</div>;
}
