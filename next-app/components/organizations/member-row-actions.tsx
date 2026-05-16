"use client";

import { useState, useTransition } from "react";
import { DotsThreeVerticalIcon } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ActionResult = { ok: true } | { ok: false; error: string };

export type MemberRowActionsProps = {
  memberId: string;
  memberName: string;
  isSelf: boolean;
  role: string;
  status: "active" | "inactive";
  isLastActiveAdmin: boolean;
  onChangeRole: (input: {
    memberId: string;
    role: "admin" | "member";
  }) => Promise<ActionResult>;
  onSetStatus: (input: {
    memberId: string;
    status: "active" | "inactive";
  }) => Promise<ActionResult>;
};

type Confirm =
  | { kind: "demote"; nextRole: "member" }
  | { kind: "promote"; nextRole: "admin" }
  | { kind: "suspend"; nextStatus: "inactive" }
  | { kind: "reactivate"; nextStatus: "active" }
  | null;

export function MemberRowActions({
  memberId,
  memberName,
  isSelf,
  role,
  status,
  isLastActiveAdmin,
  onChangeRole,
  onSetStatus,
}: MemberRowActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<Confirm>(null);

  const isPrivileged = role === "admin" || role === "owner";
  const isActive = status === "active";

  const cannotMutate = isSelf;
  const cannotRemoveAdmin = isPrivileged && isLastActiveAdmin;

  function run(action: () => Promise<ActionResult>, successMsg: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(successMsg);
        setConfirm(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleConfirm() {
    if (!confirm) return;
    if (confirm.kind === "demote") {
      run(
        () => onChangeRole({ memberId, role: confirm.nextRole }),
        `${memberName} ahora es miembro.`,
      );
    } else if (confirm.kind === "suspend") {
      run(
        () => onSetStatus({ memberId, status: confirm.nextStatus }),
        `Acceso de ${memberName} suspendido.`,
      );
    }
  }

  function handlePromote() {
    run(
      () => onChangeRole({ memberId, role: "admin" }),
      `${memberName} ahora es admin.`,
    );
  }

  function handleReactivate() {
    run(
      () => onSetStatus({ memberId, status: "active" }),
      `Acceso de ${memberName} reactivado.`,
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Acciones para ${memberName}`}
            disabled={isPending || cannotMutate}
          >
            <DotsThreeVerticalIcon weight="bold" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isPrivileged ? (
            <DropdownMenuItem
              disabled={cannotRemoveAdmin}
              onSelect={(e) => {
                e.preventDefault();
                setConfirm({ kind: "demote", nextRole: "member" });
              }}
            >
              Cambiar a miembro
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={handlePromote}>
              Cambiar a admin
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {isActive ? (
            <DropdownMenuItem
              disabled={cannotRemoveAdmin}
              onSelect={(e) => {
                e.preventDefault();
                setConfirm({ kind: "suspend", nextStatus: "inactive" });
              }}
            >
              Suspender acceso
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={handleReactivate}>
              Reactivar acceso
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open && !isPending) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "demote"
                ? `¿Cambiar a ${memberName} a miembro?`
                : `¿Suspender el acceso de ${memberName}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "demote"
                ? "Perderá los permisos de admin en esta institución."
                : "No podrá entrar a esta institución hasta que reactives su acceso."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
            >
              {confirm?.kind === "demote" ? "Cambiar" : "Suspender"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
