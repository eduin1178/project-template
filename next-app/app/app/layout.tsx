import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/lib/auth/server";

export default async function AppLayout({
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
  return <div className="min-h-screen">{children}</div>;
}
