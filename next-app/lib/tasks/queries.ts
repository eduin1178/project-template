import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { task, user } from "@/lib/db/schema";
import {
  TASK_STATUS_VALUES,
  TASK_VISIBILITY_VALUES,
  type TaskStatus,
  type TaskVisibility,
} from "@/lib/db/schema/task";

export type TaskListFilters = {
  visibility?: TaskVisibility[];
  status?: TaskStatus[];
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
  createdAt: Date;
  updatedAt: Date;
};

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
    .select({
      id: task.id,
      title: task.title,
      description: task.description,
      dueAt: task.dueAt,
      visibility: task.visibility,
      status: task.status,
      authorId: task.authorId,
      authorName: user.name,
      authorEmail: user.email,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    })
    .from(task)
    .leftJoin(user, eq(task.authorId, user.id))
    .where(and(...conditions))
    .orderBy(desc(task.createdAt));

  return rows as TaskListItem[];
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
  const [row] = await db
    .select({
      id: task.id,
      title: task.title,
      description: task.description,
      dueAt: task.dueAt,
      visibility: task.visibility,
      status: task.status,
      authorId: task.authorId,
      authorName: user.name,
      authorEmail: user.email,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    })
    .from(task)
    .leftJoin(user, eq(task.authorId, user.id))
    .where(and(eq(task.id, id), eq(task.organizationId, orgId)))
    .limit(1);
  return (row as TaskListItem | undefined) ?? null;
}
