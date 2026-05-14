import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  primaryKey,
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
    responsibleId: text("responsible_id").references(() => user.id, {
      onDelete: "set null",
    }),
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
    index("task_responsible_id_idx").on(table.responsibleId),
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

export const taskAssignee = pgTable(
  "task_assignee",
  {
    taskId: text("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.taskId, table.userId] }),
    index("task_assignee_user_id_idx").on(table.userId),
  ],
);

export const taskRelations = relations(task, ({ one, many }) => ({
  author: one(user, {
    fields: [task.authorId],
    references: [user.id],
    relationName: "task_author",
  }),
  responsible: one(user, {
    fields: [task.responsibleId],
    references: [user.id],
    relationName: "task_responsible",
  }),
  organization: one(organization, {
    fields: [task.organizationId],
    references: [organization.id],
  }),
  assignees: many(taskAssignee),
}));

export const taskAssigneeRelations = relations(taskAssignee, ({ one }) => ({
  task: one(task, {
    fields: [taskAssignee.taskId],
    references: [task.id],
  }),
  user: one(user, {
    fields: [taskAssignee.userId],
    references: [user.id],
  }),
}));
