import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { account } from "@/lib/db/schema";

export type UserAccountSummary = {
  id: string;
  providerId: string;
  accountId: string;
  hasPassword: boolean;
};

export async function listUserAccounts(
  userId: string,
): Promise<UserAccountSummary[]> {
  const rows = await db
    .select({
      id: account.id,
      providerId: account.providerId,
      accountId: account.accountId,
      password: account.password,
    })
    .from(account)
    .where(eq(account.userId, userId));

  return rows.map((row) => ({
    id: row.id,
    providerId: row.providerId,
    accountId: row.accountId,
    hasPassword: Boolean(row.password),
  }));
}

export function hasCredentialAccount(accounts: UserAccountSummary[]): boolean {
  return accounts.some((a) => a.providerId === "credential" && a.hasPassword);
}

export function hasProvider(
  accounts: UserAccountSummary[],
  providerId: string,
): boolean {
  return accounts.some((a) => a.providerId === providerId);
}

export function countAccessMethods(accounts: UserAccountSummary[]): number {
  const credential = hasCredentialAccount(accounts) ? 1 : 0;
  const socials = accounts.filter(
    (a) => a.providerId !== "credential",
  ).length;
  return credential + socials;
}
