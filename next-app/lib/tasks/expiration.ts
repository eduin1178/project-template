import type { OrgMemberRole } from "@/lib/auth/guards";

export type ExpirableTask = {
  dueAt: Date | null;
  authorId: string;
};

export type ExpirationViewer = {
  userId: string;
  role: OrgMemberRole;
};

export function isTaskExpired(
  task: Pick<ExpirableTask, "dueAt">,
  now: Date = new Date(),
): boolean {
  if (task.dueAt === null) return false;
  return task.dueAt.getTime() <= now.getTime();
}

export function canActOnExpired(
  viewer: ExpirationViewer,
  task: Pick<ExpirableTask, "authorId">,
): boolean {
  if (viewer.role === "admin" || viewer.role === "owner") return true;
  return task.authorId === viewer.userId;
}

export function passesExpirationGate(
  viewer: ExpirationViewer,
  task: Pick<ExpirableTask, "dueAt" | "authorId">,
  now: Date = new Date(),
): boolean {
  if (!isTaskExpired(task, now)) return true;
  return canActOnExpired(viewer, task);
}
