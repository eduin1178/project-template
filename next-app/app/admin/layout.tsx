import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/lib/auth/server";
import { loadMembershipsFor } from "@/lib/auth/guards";
import { signOutAction } from "@/lib/auth/actions";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { adminSidebarConfig } from "@/components/layout/contexts/admin";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

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

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          config={adminSidebarConfig}
          user={{
            name: session.user.name ?? session.user.email,
            email: session.user.email,
            image: session.user.image ?? null,
          }}
          signOutAction={signOutAction}
        />
        <SidebarInset>
          <header className="bg-background sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <span className="text-sm font-medium">Panel admin</span>
          </header>
          <main className="flex-1 px-6 py-8">{children}</main>
        </SidebarInset>
        <Toaster />
      </SidebarProvider>
    </TooltipProvider>
  );
}
