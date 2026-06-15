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

/**
 * Cuenta los searchParams visibles como filtros activos en la toolbar.
 * `status` puede seguir llegando por URL para compatibilidad, pero ya no es
 * un control primario visible en el listado visual.
 */
export function countActiveFilters(params: TasksRouteSearchParams): number {
  const visibility = params.visibility;
  if (typeof visibility === "string" && visibility.length > 0) {
    return visibility.split(",").length;
  }
  if (Array.isArray(visibility)) return visibility.length;
  return 0;
}
