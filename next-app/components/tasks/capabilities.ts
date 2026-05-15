import type { TaskVisibility } from "@/lib/db/schema/task";
import type { OrgMemberRole } from "@/lib/auth/guards";

export type TaskCapabilities = {
  canEditContent: boolean;
  canEditDueAt: boolean;
  canManageTeam: boolean;
  canTransitionVisibility: boolean;
  canTransitionStatus: boolean;
  canDelete: boolean;
  canClaim: boolean;
  canComment: boolean;
  canUploadDocument: boolean;
};

export type TaskCapabilitiesInput = {
  task: {
    authorId: string;
    visibility: TaskVisibility;
    responsibleId: string | null;
    assignees: ReadonlyArray<{ userId: string }>;
  };
  viewer: {
    userId: string;
    role: OrgMemberRole;
  };
};

export function computeTaskCapabilities({
  task,
  viewer,
}: TaskCapabilitiesInput): TaskCapabilities {
  const isAdmin = viewer.role === "admin" || viewer.role === "owner";
  const isAuthor = task.authorId === viewer.userId;
  const isResponsible = task.responsibleId === viewer.userId;
  const isAssignee = task.assignees.some((a) => a.userId === viewer.userId);
  const isParticipant = isAuthor || isResponsible || isAssignee;

  const visibility = task.visibility;

  const canEditContent =
    isAdmin || (isAuthor && visibility === "draft");
  const canEditDueAt = isAdmin && visibility !== "archived";
  const canManageTeam = isAdmin || isAuthor;
  const canTransitionVisibility = isAdmin || isAuthor;
  const canTransitionStatus = isAdmin || isParticipant;
  const canDelete = (isAdmin || isAuthor) && visibility === "draft";
  const canClaim = isAdmin && !isAuthor;
  const canComment = isAdmin || (visibility === "active" && isParticipant);
  const canUploadDocument =
    isAdmin || (visibility === "active" && isParticipant);

  return {
    canEditContent,
    canEditDueAt,
    canManageTeam,
    canTransitionVisibility,
    canTransitionStatus,
    canDelete,
    canClaim,
    canComment,
    canUploadDocument,
  };
}
