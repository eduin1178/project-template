"use client";

import { usePathname } from "next/navigation";

function resolveLabel(pathname: string): string {
  if (pathname === "/account/profile") return "Perfil";
  if (pathname.startsWith("/account/organizations")) return "Mis instituciones";
  if (pathname === "/account/invitations") return "Mis invitaciones";
  if (pathname === "/account/suspended") return "Cuenta suspendida";
  return "Mi cuenta";
}

export function AccountHeaderLabel() {
  const pathname = usePathname();
  return <span>{resolveLabel(pathname)}</span>;
}
