import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const superInvitation = pgTable(
  "super_invitation",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    token: text("token").notNull().unique(),
    invitedEmail: text("invited_email").notNull(),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    acceptedBy: text("accepted_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("super_invitation_invited_by_idx").on(table.invitedBy),
    index("super_invitation_expires_at_idx").on(table.expiresAt),
  ],
);

export type SuperInvitation = typeof superInvitation.$inferSelect;
export type NewSuperInvitation = typeof superInvitation.$inferInsert;
