import type { TaskStatus, TaskVisibility } from "@/lib/db/schema/task";

const VISIBILITY_TRANSITIONS: Record<TaskVisibility, ReadonlyArray<TaskVisibility>> = {
  draft: ["active"],
  active: ["draft", "archived"],
  archived: ["active"],
};

const STATUS_TRANSITIONS: Record<TaskStatus, ReadonlyArray<TaskStatus>> = {
  pending: ["in_progress"],
  in_progress: ["pending", "done"],
  done: ["pending", "in_progress"],
};

export function isVisibilityTransitionAllowed(
  from: TaskVisibility,
  to: TaskVisibility,
): boolean {
  if (from === to) return true;
  return VISIBILITY_TRANSITIONS[from].includes(to);
}

export function isStatusTransitionAllowed(
  from: TaskStatus,
  to: TaskStatus,
): boolean {
  if (from === to) return true;
  return STATUS_TRANSITIONS[from].includes(to);
}
