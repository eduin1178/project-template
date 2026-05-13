"use server";

import { redirect } from "next/navigation";

import { redirectToDashboard } from "@/lib/auth/guards";

export async function redirectAfterLoginAction(next?: string) {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    redirect(next);
  }
  await redirectToDashboard();
}
