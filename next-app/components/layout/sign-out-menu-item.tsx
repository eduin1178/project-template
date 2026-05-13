"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { SignOutIcon } from "@phosphor-icons/react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth/client";

export function SignOutMenuItem() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenuItem
      disabled={pending}
      onSelect={(event) => {
        event.preventDefault();
        startTransition(async () => {
          await authClient.signOut();
          router.push("/login");
          router.refresh();
        });
      }}
    >
      <SignOutIcon />
      Cerrar sesión
    </DropdownMenuItem>
  );
}
