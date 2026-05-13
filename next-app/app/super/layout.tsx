import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/lib/auth/server";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "./actions-session";

export default async function SuperLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "super_admin") {
    notFound();
  }

  const initials = (session.user.name ?? session.user.email)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="bg-muted/30 min-h-screen">
      <header className="bg-background border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/super" className="text-lg font-semibold">
            Edunet · Panel super
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="hover:bg-muted flex items-center gap-2 rounded-full p-1"
              >
                <Avatar className="size-8">
                  <AvatarFallback>{initials || "SA"}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              <DropdownMenuLabel>
                <div className="text-sm font-medium">
                  {session.user.name ?? "Super admin"}
                </div>
                <div className="text-muted-foreground text-xs">
                  {session.user.email}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <form action={signOutAction}>
                <DropdownMenuItem asChild>
                  <button type="submit" className="w-full text-left">
                    Cerrar sesión
                  </button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
