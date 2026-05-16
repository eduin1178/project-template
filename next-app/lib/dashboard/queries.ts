import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db/client";

export type TopTaskRow = {
  id: string;
  title: string;
  dueAt: Date | null;
};

export type ResponsibleRow = {
  userId: string;
  name: string | null;
  email: string | null;
  image: string | null;
  openCount: number;
};

export type DashboardCommon = {
  pending: number;
  inProgress: number;
  done: number;
  overdue: number;
  dueSoon: number;
  completion30d: {
    done: number;
    created: number;
  };
  topPending: TopTaskRow[];
  topInProgress: TopTaskRow[];
  storageBytes: number;
};

export type AdminDashboardData = DashboardCommon & {
  memberTotal: number;
  byResponsible: ResponsibleRow[];
};

export type MemberDashboardData = DashboardCommon;

type RawTopTask = {
  id: string;
  title: string;
  due_at: string | null;
};

type RawResponsible = {
  user_id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  open_count: number | string;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function parseTopTasks(raw: unknown): TopTaskRow[] {
  if (!raw || !Array.isArray(raw)) return [];
  return (raw as RawTopTask[]).map((row) => ({
    id: row.id,
    title: row.title,
    dueAt: row.due_at ? new Date(row.due_at) : null,
  }));
}

function parseResponsibles(raw: unknown): ResponsibleRow[] {
  if (!raw || !Array.isArray(raw)) return [];
  return (raw as RawResponsible[]).map((row) => ({
    userId: row.user_id,
    name: row.name,
    email: row.email,
    image: row.image,
    openCount: toNumber(row.open_count),
  }));
}

export async function getAdminDashboard(
  orgId: string,
): Promise<AdminDashboardData> {
  const result = await db.execute(sql`
    WITH active_tasks AS (
      SELECT id, title, status, due_at, responsible_id, created_at, updated_at
      FROM task
      WHERE organization_id = ${orgId} AND visibility = 'active'
    ),
    status_counts AS (
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')     AS pending,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'done')        AS done,
        COUNT(*) FILTER (WHERE status != 'done' AND due_at IS NOT NULL AND due_at < NOW())                                                                                  AS overdue,
        COUNT(*) FILTER (WHERE status != 'done' AND due_at IS NOT NULL AND due_at >= NOW() AND due_at < NOW() + INTERVAL '7 days')                                          AS due_soon
      FROM active_tasks
    ),
    window_30d AS (
      SELECT
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')                                          AS created_30d,
        COUNT(*) FILTER (WHERE status = 'done' AND updated_at >= NOW() - INTERVAL '30 days')                      AS done_30d
      FROM active_tasks
    ),
    top_pending AS (
      SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::json) AS rows
      FROM (
        SELECT id, title, due_at, created_at
        FROM active_tasks
        WHERE status = 'pending'
        ORDER BY created_at DESC
        LIMIT 5
      ) t
    ),
    top_in_progress AS (
      SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.updated_at DESC), '[]'::json) AS rows
      FROM (
        SELECT id, title, due_at, updated_at
        FROM active_tasks
        WHERE status = 'in_progress'
        ORDER BY updated_at DESC
        LIMIT 5
      ) t
    ),
    by_responsible AS (
      SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.open_count DESC), '[]'::json) AS rows
      FROM (
        SELECT
          u.id AS user_id, u.name, u.email, u.image,
          COUNT(*)::int AS open_count
        FROM active_tasks at
        JOIN "user" u ON u.id = at.responsible_id
        WHERE at.responsible_id IS NOT NULL
          AND at.status IN ('pending', 'in_progress')
        GROUP BY u.id, u.name, u.email, u.image
        ORDER BY open_count DESC
        LIMIT 5
      ) r
    ),
    member_count AS (
      SELECT COUNT(*)::int AS total FROM member WHERE organization_id = ${orgId}
    ),
    storage AS (
      SELECT COALESCE(SUM(td.size_bytes), 0)::bigint AS bytes
      FROM task_document td
      JOIN task t ON t.id = td.task_id
      WHERE t.organization_id = ${orgId}
    )
    SELECT
      sc.pending,
      sc.in_progress,
      sc.done,
      sc.overdue,
      sc.due_soon,
      w.created_30d,
      w.done_30d,
      tp.rows  AS top_pending,
      tip.rows AS top_in_progress,
      br.rows  AS by_responsible,
      mc.total AS member_total,
      s.bytes  AS storage_bytes
    FROM status_counts sc, window_30d w, top_pending tp, top_in_progress tip, by_responsible br, member_count mc, storage s;
  `);

  const row = (result as unknown as Array<Record<string, unknown>>)[0] ?? {};

  return {
    pending: toNumber(row.pending),
    inProgress: toNumber(row.in_progress),
    done: toNumber(row.done),
    overdue: toNumber(row.overdue),
    dueSoon: toNumber(row.due_soon),
    completion30d: {
      done: toNumber(row.done_30d),
      created: toNumber(row.created_30d),
    },
    topPending: parseTopTasks(row.top_pending),
    topInProgress: parseTopTasks(row.top_in_progress),
    storageBytes: toNumber(row.storage_bytes),
    memberTotal: toNumber(row.member_total),
    byResponsible: parseResponsibles(row.by_responsible),
  };
}

export async function getMemberDashboard(
  orgId: string,
  userId: string,
): Promise<MemberDashboardData> {
  const result = await db.execute(sql`
    WITH active_tasks AS (
      SELECT id, title, status, due_at, responsible_id, created_at, updated_at
      FROM task
      WHERE organization_id = ${orgId}
        AND visibility = 'active'
        AND (
          responsible_id = ${userId}
          OR EXISTS (
            SELECT 1 FROM task_assignee ta
            WHERE ta.task_id = task.id AND ta.user_id = ${userId}
          )
        )
    ),
    status_counts AS (
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')     AS pending,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'done')        AS done,
        COUNT(*) FILTER (WHERE status != 'done' AND due_at IS NOT NULL AND due_at < NOW())                                                                                  AS overdue,
        COUNT(*) FILTER (WHERE status != 'done' AND due_at IS NOT NULL AND due_at >= NOW() AND due_at < NOW() + INTERVAL '7 days')                                          AS due_soon
      FROM active_tasks
    ),
    window_30d AS (
      SELECT
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')                                          AS created_30d,
        COUNT(*) FILTER (WHERE status = 'done' AND updated_at >= NOW() - INTERVAL '30 days')                      AS done_30d
      FROM active_tasks
    ),
    top_pending AS (
      SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::json) AS rows
      FROM (
        SELECT id, title, due_at, created_at
        FROM active_tasks
        WHERE status = 'pending'
        ORDER BY created_at DESC
        LIMIT 5
      ) t
    ),
    top_in_progress AS (
      SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.updated_at DESC), '[]'::json) AS rows
      FROM (
        SELECT id, title, due_at, updated_at
        FROM active_tasks
        WHERE status = 'in_progress'
        ORDER BY updated_at DESC
        LIMIT 5
      ) t
    ),
    storage AS (
      SELECT COALESCE(SUM(size_bytes), 0)::bigint AS bytes
      FROM task_document
      WHERE uploader_id = ${userId}
    )
    SELECT
      sc.pending,
      sc.in_progress,
      sc.done,
      sc.overdue,
      sc.due_soon,
      w.created_30d,
      w.done_30d,
      tp.rows  AS top_pending,
      tip.rows AS top_in_progress,
      s.bytes  AS storage_bytes
    FROM status_counts sc, window_30d w, top_pending tp, top_in_progress tip, storage s;
  `);

  const row = (result as unknown as Array<Record<string, unknown>>)[0] ?? {};

  return {
    pending: toNumber(row.pending),
    inProgress: toNumber(row.in_progress),
    done: toNumber(row.done),
    overdue: toNumber(row.overdue),
    dueSoon: toNumber(row.due_soon),
    completion30d: {
      done: toNumber(row.done_30d),
      created: toNumber(row.created_30d),
    },
    topPending: parseTopTasks(row.top_pending),
    topInProgress: parseTopTasks(row.top_in_progress),
    storageBytes: toNumber(row.storage_bytes),
  };
}
