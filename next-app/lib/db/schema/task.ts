import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { organization, user } from "./auth";

export const TASK_VISIBILITY_VALUES = ["draft", "active", "archived"] as const;
export const TASK_STATUS_VALUES = ["pending", "in_progress", "done"] as const;

export type TaskVisibility = (typeof TASK_VISIBILITY_VALUES)[number];
export type TaskStatus = (typeof TASK_STATUS_VALUES)[number];

export const task = pgTable(
  "task",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    visibility: text("visibility").default("draft").notNull(),
    status: text("status").default("pending").notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("task_organization_id_idx").on(table.organizationId),
    index("task_author_id_idx").on(table.authorId),
    check(
      "task_visibility_check",
      sql`${table.visibility} IN ('draft', 'active', 'archived')`,
    ),
    check(
      "task_status_check",
      sql`${table.status} IN ('pending', 'in_progress', 'done')`,
    ),
  ],
);

export const taskRelations = relations(task, ({ one }) => ({
  author: one(user, {
    fields: [task.authorId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [task.organizationId],
    references: [organization.id],
  }),
}));
