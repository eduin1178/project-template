import type { OrgMemberRole } from "@/lib/auth/guards";
import type { TaskVisibility } from "@/lib/db/schema/task";

export type ChecklistAuthContext = {
  viewer: {
    userId: string;
    role: OrgMemberRole;
  };
  task: {
    organizationId: string;
    visibility: TaskVisibility;
    authorId: string;
    responsibleId: string | null;
    assignees: ReadonlyArray<{ userId: string }>;
  };
};

/**
 * assertCanManageChecklist
 *
 * Gate compartido para las cuatro operaciones de mutación del checklist
 * (crear item, editar label, toggle checked, eliminar item).
 *
 * Matriz de autorización por visibility:
 *   - draft    → solo authorId + admin/owner
 *               (responsable y assignees NO pueden mutar en draft)
 *   - active   → admin/owner, autor, responsable, assignees
 *   - archived → nadie (ni admin)
 *
 * Diverge intencionalmente de canComment / canUploadDocument:
 * en draft el checklist es herramienta de planificación, no de ejecución
 * colaborativa. Ver design.md Decisión 1.
 *
 * @throws Error con mensaje de autorización si el viewer no puede operar.
 */
export function assertCanManageChecklist({
  viewer,
  task,
}: ChecklistAuthContext): void {
  const isAdmin = viewer.role === "admin" || viewer.role === "owner";
  const visibility = task.visibility;

  if (visibility === "archived") {
    throw new Error(
      "No se puede modificar el checklist de una tarea archivada.",
    );
  }

  if (visibility === "draft") {
    // En draft: solo autor + admin/owner
    if (isAdmin || task.authorId === viewer.userId) return;
    throw new Error(
      "No tienes permisos para modificar el checklist de esta tarea.",
    );
  }

  // visibility === "active"
  if (isAdmin) return;

  const isAuthor = task.authorId === viewer.userId;
  const isResponsible = task.responsibleId === viewer.userId;
  const isAssignee = task.assignees.some((a) => a.userId === viewer.userId);

  if (isAuthor || isResponsible || isAssignee) return;

  throw new Error(
    "No tienes permisos para modificar el checklist de esta tarea.",
  );
}

/**
 * canManageChecklist
 *
 * Versión booleana de la misma matriz — usada por computeTaskCapabilities
 * para proyectar la capability al cliente sin lanzar excepciones.
 */
export function canManageChecklist({
  viewer,
  task,
}: ChecklistAuthContext): boolean {
  const isAdmin = viewer.role === "admin" || viewer.role === "owner";
  const visibility = task.visibility;

  if (visibility === "archived") return false;

  if (visibility === "draft") {
    return isAdmin || task.authorId === viewer.userId;
  }

  // active
  if (isAdmin) return true;
  const isAuthor = task.authorId === viewer.userId;
  const isResponsible = task.responsibleId === viewer.userId;
  const isAssignee = task.assignees.some((a) => a.userId === viewer.userId);
  return isAuthor || isResponsible || isAssignee;
}
