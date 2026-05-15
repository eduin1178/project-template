import type { TaskVisibility } from "@/lib/db/schema/task";
import type { OrgMemberRole } from "@/lib/auth/guards";
import {
  canActOnExpired as canActOnExpiredHelper,
  isTaskExpired,
} from "@/lib/tasks/expiration";

export type TaskCapabilities = {
  canEditContent: boolean;
  canEditDueAt: boolean;
  canManageTeam: boolean;
  canTransitionVisibility: boolean;
  canTransitionStatus: boolean;
  canChangeStatus: boolean;
  canDelete: boolean;
  canClaim: boolean;
  canComment: boolean;
  canUploadDocument: boolean;
  canManageChecklist: boolean;
  isExpired: boolean;
};

export type TaskCapabilitiesInput = {
  task: {
    authorId: string;
    visibility: TaskVisibility;
    responsibleId: string | null;
    assignees: ReadonlyArray<{ userId: string }>;
    dueAt: Date | null;
  };
  viewer: {
    userId: string;
    role: OrgMemberRole;
  };
  now?: Date;
};

export function computeTaskCapabilities({
  task,
  viewer,
  now = new Date(),
}: TaskCapabilitiesInput): TaskCapabilities {
  const isAdmin = viewer.role === "admin" || viewer.role === "owner";
  const isAuthor = task.authorId === viewer.userId;
  const isResponsible = task.responsibleId === viewer.userId;
  const isAssignee = task.assignees.some((a) => a.userId === viewer.userId);
  const isParticipant = isAuthor || isResponsible || isAssignee;

  const visibility = task.visibility;
  const expired = isTaskExpired({ dueAt: task.dueAt }, now);
  const bypassesExpiration = canActOnExpiredHelper(viewer, {
    authorId: task.authorId,
  });
  const expirationOk = !expired || bypassesExpiration;

  const canEditContent = isAdmin || (isAuthor && visibility === "draft");
  const canEditDueAt = isAdmin && visibility !== "archived";
  const canManageTeam = isAdmin || isAuthor;
  const canTransitionVisibility = isAdmin || isAuthor;
  const canDelete = (isAdmin || isAuthor) && visibility === "draft";
  const canClaim = isAdmin && !isAuthor;
  const canComment = isAdmin || (visibility === "active" && isParticipant);

  const canTransitionStatus = isAdmin || (isParticipant && expirationOk);
  const canChangeStatus =
    visibility === "active" && (isAdmin || isParticipant) && expirationOk;

  const canUploadDocument =
    (isAdmin || (visibility === "active" && isParticipant)) && expirationOk;

  let canManageChecklist = false;
  if (visibility === "archived") {
    canManageChecklist = false;
  } else if (visibility === "draft") {
    canManageChecklist = isAdmin || isAuthor;
  } else {
    canManageChecklist = (isAdmin || isParticipant) && expirationOk;
  }

  return {
    canEditContent,
    canEditDueAt,
    canManageTeam,
    canTransitionVisibility,
    canTransitionStatus,
    canChangeStatus,
    canDelete,
    canClaim,
    canComment,
    canUploadDocument,
    canManageChecklist,
    isExpired: expired,
  };
}
