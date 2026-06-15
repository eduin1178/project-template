import "server-only";

import {
  TASK_STATUS_VALUES,
  TASK_VISIBILITY_VALUES,
  type TaskStatus,
  type TaskVisibility,
} from "@/lib/db/schema/task";
import {
  getTaskCounts,
  listOrgMembers,
  listTasks,
  listTasksForMember,
  type OrgMemberOption,
  type TaskCounts,
  type TaskListItem,
} from "@/lib/tasks/queries";

export type TasksRouteSearchParams = Record<
  string,
  string | string[] | undefined
>;

export type TaskListViewMode = "board" | "cards";

export function parseTaskListViewMode(
  raw: string | string[] | undefined,
): TaskListViewMode {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "cards" ? "cards" : "board";
}

function parseMulti<T extends string>(
  raw: string | string[] | undefined,
  allowed: ReadonlyArray<T>,
): T[] {
  if (!raw) return [];
  const values = Array.isArray(raw) ? raw : raw.split(",");
  return values.filter((v): v is T => allowed.includes(v as T));
}

export type LoadedTasksRoute = {
  params: TasksRouteSearchParams;
  viewMode: TaskListViewMode;
  status: TaskStatus[];
  visibility: TaskVisibility[];
  tasks: TaskListItem[];
  counts: TaskCounts;
  members: OrgMemberOption[];
};

/**
 * Carga la data común para las rutas de bandeja de tareas (`/tasks` y `/admin/tasks`).
 *
 * - Para admins: lista todas las tareas con filtros de visibility y status.
 * - Para members: lista solo tareas active donde participan, con filtro de status.
 *
 * El default de `status` cuando la key NO está presente en la URL difiere por scope:
 * - admin (`/admin/tasks`): `["pending"]`
 * - member (`/tasks`): `["pending", "in_progress"]`
 *
 * Pasar `defaultStatus` para sobreescribir.
 */
export async function loadTasksRouteData({
  orgId,
  userId,
  isAdmin,
  searchParams,
  defaultStatus,
}: {
  orgId: string;
  userId: string;
  isAdmin: boolean;
  searchParams: Promise<TasksRouteSearchParams>;
  defaultStatus: TaskStatus[];
}): Promise<LoadedTasksRoute> {
  const params = await searchParams;
  const viewMode = parseTaskListViewMode(params.view);
  const status =
    "status" in params
      ? parseMulti<TaskStatus>(params.status, TASK_STATUS_VALUES)
      : defaultStatus;
  const visibility = isAdmin
    ? parseMulti<TaskVisibility>(params.visibility, TASK_VISIBILITY_VALUES)
    : [];

  const tasksPromise = isAdmin
    ? listTasks({ orgId, filters: { visibility, status } })
    : listTasksForMember({ orgId, userId, filters: { status } });

  const [tasks, counts, members] = await Promise.all([
    tasksPromise,
    getTaskCounts({ orgId }),
    listOrgMembers({ orgId }),
  ]);

  return { params, viewMode, status, visibility, tasks, counts, members };
}

/**
 * Construye un querystring que preserva todos los searchParams EXCEPTO `taskId`.
 * Útil para construir URLs canónicas de detalle preservando filtros.
 */
export function preservedQuery(params: TasksRouteSearchParams): string {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "taskId") continue;
    if (typeof value === "string") {
      out.set(key, value);
    } else if (Array.isArray(value)) {
      for (const v of value) out.append(key, v);
    }
  }
  const qs = out.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Cuenta los searchParams "activos" (no triviales) para mostrar un badge
 * en el botón de filtros mobile. Solo cuenta keys conocidas.
 */
export function countActiveFilters(params: TasksRouteSearchParams): number {
  let n = 0;
  for (const key of ["visibility", "status"] as const) {
    const v = params[key];
    if (typeof v === "string" && v.length > 0) n += v.split(",").length;
    else if (Array.isArray(v)) n += v.length;
  }
  return n;
}
