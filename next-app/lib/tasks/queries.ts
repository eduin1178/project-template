import "server-only";

import { and, desc, eq, exists, inArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/lib/db/client";
import {
  member,
  task,
  taskAssignee,
  taskComment,
  user,
} from "@/lib/db/schema";
import {
  TASK_STATUS_VALUES,
  TASK_VISIBILITY_VALUES,
  type TaskStatus,
  type TaskVisibility,
} from "@/lib/db/schema/task";

import { isWithinEditWindow } from "./comments";

const authorUser = alias(user, "author_user");
const responsibleUser = alias(user, "responsible_user");

export type TaskListFilters = {
  visibility?: TaskVisibility[];
  status?: TaskStatus[];
};

export type TaskAssigneeItem = {
  userId: string;
  name: string | null;
  email: string | null;
};

export type TaskListItem = {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date | null;
  visibility: TaskVisibility;
  status: TaskStatus;
  authorId: string;
  authorName: string | null;
  authorEmail: string | null;
  responsibleId: string | null;
  responsibleName: string | null;
  responsibleEmail: string | null;
  assignees: TaskAssigneeItem[];
  createdAt: Date;
  updatedAt: Date;
};

type TaskRow = Omit<TaskListItem, "assignees">;

const TASK_SELECT_SHAPE = {
  id: task.id,
  title: task.title,
  description: task.description,
  dueAt: task.dueAt,
  visibility: task.visibility,
  status: task.status,
  authorId: task.authorId,
  authorName: authorUser.name,
  authorEmail: authorUser.email,
  responsibleId: task.responsibleId,
  responsibleName: responsibleUser.name,
  responsibleEmail: responsibleUser.email,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
} as const;

async function attachAssignees(rows: TaskRow[]): Promise<TaskListItem[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const assigneeRows = await db
    .select({
      taskId: taskAssignee.taskId,
      userId: taskAssignee.userId,
      name: user.name,
      email: user.email,
    })
    .from(taskAssignee)
    .leftJoin(user, eq(taskAssignee.userId, user.id))
    .where(inArray(taskAssignee.taskId, ids));

  const grouped = new Map<string, TaskAssigneeItem[]>();
  for (const row of assigneeRows) {
    const list = grouped.get(row.taskId) ?? [];
    list.push({ userId: row.userId, name: row.name, email: row.email });
    grouped.set(row.taskId, list);
  }
  return rows.map((r) => ({ ...r, assignees: grouped.get(r.id) ?? [] }));
}

function normalizeRow(row: typeof TASK_SELECT_SHAPE extends infer _ ? Record<string, unknown> : never): TaskRow {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    dueAt: (row.dueAt as Date | null) ?? null,
    visibility: row.visibility as TaskVisibility,
    status: row.status as TaskStatus,
    authorId: row.authorId as string,
    authorName: (row.authorName as string | null) ?? null,
    authorEmail: (row.authorEmail as string | null) ?? null,
    responsibleId: (row.responsibleId as string | null) ?? null,
    responsibleName: (row.responsibleName as string | null) ?? null,
    responsibleEmail: (row.responsibleEmail as string | null) ?? null,
    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
  };
}

export async function listTasks({
  orgId,
  filters,
}: {
  orgId: string;
  filters?: TaskListFilters;
}): Promise<TaskListItem[]> {
  const conditions = [eq(task.organizationId, orgId)];
  if (filters?.visibility && filters.visibility.length > 0) {
    conditions.push(inArray(task.visibility, filters.visibility));
  }
  if (filters?.status && filters.status.length > 0) {
    conditions.push(inArray(task.status, filters.status));
  }

  const rows = await db
    .select(TASK_SELECT_SHAPE)
    .from(task)
    .leftJoin(authorUser, eq(task.authorId, authorUser.id))
    .leftJoin(responsibleUser, eq(task.responsibleId, responsibleUser.id))
    .where(and(...conditions))
    .orderBy(desc(task.createdAt));

  return attachAssignees(rows.map((r) => normalizeRow(r as Record<string, unknown>)));
}

export async function listTasksForMember({
  orgId,
  userId,
  filters,
}: {
  orgId: string;
  userId: string;
  filters?: Pick<TaskListFilters, "status">;
}): Promise<TaskListItem[]> {
  const assigneeExists = exists(
    db
      .select({ one: sql<number>`1` })
      .from(taskAssignee)
      .where(
        and(eq(taskAssignee.taskId, task.id), eq(taskAssignee.userId, userId)),
      ),
  );

  const conditions = [
    eq(task.organizationId, orgId),
    eq(task.visibility, "active"),
    or(
      eq(task.authorId, userId),
      eq(task.responsibleId, userId),
      assigneeExists,
    )!,
  ];
  if (filters?.status && filters.status.length > 0) {
    conditions.push(inArray(task.status, filters.status));
  }

  const rows = await db
    .select(TASK_SELECT_SHAPE)
    .from(task)
    .leftJoin(authorUser, eq(task.authorId, authorUser.id))
    .leftJoin(responsibleUser, eq(task.responsibleId, responsibleUser.id))
    .where(and(...conditions))
    .orderBy(desc(task.createdAt));

  return attachAssignees(rows.map((r) => normalizeRow(r as Record<string, unknown>)));
}

export async function getTaskById({
  orgId,
  id,
}: {
  orgId: string;
  id: string;
}) {
  const [row] = await db
    .select()
    .from(task)
    .where(and(eq(task.id, id), eq(task.organizationId, orgId)))
    .limit(1);
  return row ?? null;
}

export type TaskCounts = {
  visibility: Record<TaskVisibility, number>;
  status: Record<TaskStatus, number>;
  total: number;
};

export async function getTaskCounts({
  orgId,
}: {
  orgId: string;
}): Promise<TaskCounts> {
  const visibilityRows = await db
    .select({
      visibility: task.visibility,
      count: sql<number>`count(*)::int`,
    })
    .from(task)
    .where(eq(task.organizationId, orgId))
    .groupBy(task.visibility);

  const statusRows = await db
    .select({
      status: task.status,
      count: sql<number>`count(*)::int`,
    })
    .from(task)
    .where(eq(task.organizationId, orgId))
    .groupBy(task.status);

  const visibilityCounts = Object.fromEntries(
    TASK_VISIBILITY_VALUES.map((v) => [v, 0]),
  ) as Record<TaskVisibility, number>;
  for (const row of visibilityRows) {
    const v = row.visibility as TaskVisibility;
    if (v in visibilityCounts) visibilityCounts[v] = row.count;
  }

  const statusCounts = Object.fromEntries(
    TASK_STATUS_VALUES.map((s) => [s, 0]),
  ) as Record<TaskStatus, number>;
  for (const row of statusRows) {
    const s = row.status as TaskStatus;
    if (s in statusCounts) statusCounts[s] = row.count;
  }

  const total = Object.values(visibilityCounts).reduce((a, b) => a + b, 0);
  return { visibility: visibilityCounts, status: statusCounts, total };
}

export async function getTaskWithAuthorById({
  orgId,
  id,
}: {
  orgId: string;
  id: string;
}): Promise<TaskListItem | null> {
  const rows = await db
    .select(TASK_SELECT_SHAPE)
    .from(task)
    .leftJoin(authorUser, eq(task.authorId, authorUser.id))
    .leftJoin(responsibleUser, eq(task.responsibleId, responsibleUser.id))
    .where(and(eq(task.id, id), eq(task.organizationId, orgId)))
    .limit(1);
  if (rows.length === 0) return null;
  const [withAssignees] = await attachAssignees(
    rows.map((r) => normalizeRow(r as Record<string, unknown>)),
  );
  return withAssignees ?? null;
}

export async function getTaskByIdForViewer({
  orgId,
  taskId,
  viewerUserId,
  isAdmin,
}: {
  orgId: string;
  taskId: string;
  viewerUserId: string;
  isAdmin: boolean;
}): Promise<TaskListItem | null> {
  const candidate = await getTaskWithAuthorById({ orgId, id: taskId });
  if (!candidate) return null;
  if (isAdmin) return candidate;
  if (candidate.visibility !== "active") return null;
  const isAuthor = candidate.authorId === viewerUserId;
  const isResponsible = candidate.responsibleId === viewerUserId;
  const isAssignee = candidate.assignees.some(
    (a) => a.userId === viewerUserId,
  );
  if (!isAuthor && !isResponsible && !isAssignee) return null;
  return candidate;
}

export type OrgMemberOption = {
  userId: string;
  name: string | null;
  email: string | null;
  role: string;
};

export async function listOrgMembers({
  orgId,
}: {
  orgId: string;
}): Promise<OrgMemberOption[]> {
  const rows = await db
    .select({
      userId: member.userId,
      role: member.role,
      name: user.name,
      email: user.email,
    })
    .from(member)
    .leftJoin(user, eq(member.userId, user.id))
    .where(and(eq(member.organizationId, orgId), eq(member.status, "active")));
  return rows.map((r) => ({
    userId: r.userId,
    name: r.name,
    email: r.email,
    role: r.role,
  }));
}

export type TaskCommentView = {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string | null;
  authorEmail: string | null;
  authorImage: string | null;
  body: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  deletedByName: string | null;
  deletedByEmail: string | null;
  canDelete: boolean;
  isOwn: boolean;
};

export async function listCommentsForTask({
  taskId,
  viewerUserId,
  isAdmin,
}: {
  taskId: string;
  viewerUserId: string;
  isAdmin: boolean;
}): Promise<TaskCommentView[]> {
  const rows = await db
    .select({
      id: taskComment.id,
      taskId: taskComment.taskId,
      authorId: taskComment.authorId,
      authorName: user.name,
      authorEmail: user.email,
      authorImage: user.image,
      body: taskComment.body,
      createdAt: taskComment.createdAt,
      deletedAt: taskComment.deletedAt,
      deletedByName: taskComment.deletedByName,
      deletedByEmail: taskComment.deletedByEmail,
    })
    .from(taskComment)
    .leftJoin(user, eq(taskComment.authorId, user.id))
    .where(eq(taskComment.taskId, taskId))
    .orderBy(taskComment.createdAt);

  const now = new Date();
  return rows.map((row) => {
    const isDeleted = row.deletedAt !== null;
    const isAuthor = row.authorId === viewerUserId;
    const canDelete =
      !isDeleted &&
      (isAdmin || (isAuthor && isWithinEditWindow(row.createdAt, now)));
    return {
      id: row.id,
      taskId: row.taskId,
      authorId: row.authorId,
      authorName: row.authorName ?? null,
      authorEmail: row.authorEmail ?? null,
      authorImage: row.authorImage ?? null,
      body: isDeleted ? null : row.body,
      createdAt: row.createdAt,
      deletedAt: row.deletedAt,
      deletedByName: row.deletedByName,
      deletedByEmail: row.deletedByEmail,
      canDelete,
      isOwn: isAuthor,
    };
  });
}

export async function isUserMemberOfOrg({
  orgId,
  userId,
}: {
  orgId: string;
  userId: string;
}): Promise<boolean> {
  const [row] = await db
    .select({ id: member.id })
    .from(member)
    .where(
      and(
        eq(member.organizationId, orgId),
        eq(member.userId, userId),
        eq(member.status, "active"),
      ),
    )
    .limit(1);
  return Boolean(row);
}
