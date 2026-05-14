import type { OrgMemberRole } from "@/lib/auth/guards";
import type { TaskVisibility } from "@/lib/db/schema/task";

import type { TaskListItem } from "./queries";

export type TaskCapabilities = {
  canViewDetail: boolean;
  canEditContent: boolean;
  canEditDueAt: boolean;
  canDelete: boolean;
  canClaim: boolean;
  canTransitionVisibility: boolean;
  canTransitionStatus: boolean;
  canManageTeam: boolean;
};

export type ViewerContext = {
  userId: string;
  role: OrgMemberRole;
};

function isAdminRole(role: OrgMemberRole): boolean {
  return role === "admin" || role === "owner";
}

export function computeCapabilities({
  task,
  viewer,
}: {
  task: Pick<TaskListItem, "authorId" | "visibility">;
  viewer: ViewerContext;
}): TaskCapabilities {
  const isAdmin = isAdminRole(viewer.role);
  const isAuthor = task.authorId === viewer.userId;
  const visibility = task.visibility as TaskVisibility;

  const canEditContent = isAdmin || (isAuthor && visibility === "draft");
  const canEditDueAt = isAdmin && visibility !== "archived";
  const canDelete = (isAdmin || isAuthor) && visibility === "draft";
  const canClaim = isAdmin && !isAuthor;
  const canTransitionVisibility = isAdmin;
  const canTransitionStatus = isAdmin;
  const canManageTeam = isAdmin || isAuthor;

  return {
    canViewDetail: true,
    canEditContent,
    canEditDueAt,
    canDelete,
    canClaim,
    canTransitionVisibility,
    canTransitionStatus,
    canManageTeam,
  };
}

export function readOnlyCapabilities(): TaskCapabilities {
  return {
    canViewDetail: true,
    canEditContent: false,
    canEditDueAt: false,
    canDelete: false,
    canClaim: false,
    canTransitionVisibility: false,
    canTransitionStatus: false,
    canManageTeam: false,
  };
}
