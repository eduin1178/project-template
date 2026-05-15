import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
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

export const taskComment = pgTable(
  "task_comment",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedByName: text("deleted_by_name"),
    deletedByEmail: text("deleted_by_email"),
  },
  (table) => [
    index("task_comment_task_id_created_at_idx").on(
      table.taskId,
      table.createdAt,
    ),
    index("task_comment_author_id_idx").on(table.authorId),
  ],
);

export const taskCommentRelations = relations(taskComment, ({ one }) => ({
  task: one(task, {
    fields: [taskComment.taskId],
    references: [task.id],
  }),
  author: one(user, {
    fields: [taskComment.authorId],
    references: [user.id],
  }),
}));

export const taskDocument = pgTable(
  "task_document",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    uploaderId: text("uploader_id").references(() => user.id, {
      onDelete: "set null",
    }),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("task_document_task_id_created_at_idx").on(
      table.taskId,
      table.createdAt,
    ),
    uniqueIndex("task_document_storage_key_unique").on(table.storageKey),
  ],
);

export const taskDocumentRelations = relations(taskDocument, ({ one }) => ({
  task: one(task, {
    fields: [taskDocument.taskId],
    references: [task.id],
  }),
  uploader: one(user, {
    fields: [taskDocument.uploaderId],
    references: [user.id],
  }),
}));

/**
 * taskChecklistItem — items del checklist de una tarea.
 *
 * Autorización de mutación (crear, editar label, toggle, eliminar):
 *   - draft    → solo authorId + admin/owner (NO responsable ni assignees)
 *   - active   → admin/owner, autor, responsable, assignees
 *   - archived → nadie (ni admin)
 *
 * checkedById / checkedAt se persisten para auditoría pero no se exponen
 * al cliente en v1. Usar proyección explícita en queries.ts.
 */
export const taskChecklistItem = pgTable(
  "task_checklist_item",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    checked: boolean("checked").default(false).notNull(),
    checkedById: text("checked_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    checkedAt: timestamp("checked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("task_checklist_item_task_id_created_at_idx").on(
      table.taskId,
      table.createdAt,
    ),
  ],
);

export const taskChecklistItemRelations = relations(
  taskChecklistItem,
  ({ one }) => ({
    task: one(task, {
      fields: [taskChecklistItem.taskId],
      references: [task.id],
    }),
    checkedBy: one(user, {
      fields: [taskChecklistItem.checkedById],
      references: [user.id],
      relationName: "checklist_item_checked_by",
    }),
  }),
);

// Extend taskRelations to include checklistItems.
// Note: Drizzle requires re-declaring relations using the same table variable.
// We augment taskRelations above by re-exporting a new declaration.
export const taskChecklistRelations = relations(task, ({ many }) => ({
  checklistItems: many(taskChecklistItem),
}));
