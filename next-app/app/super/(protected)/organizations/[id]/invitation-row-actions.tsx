"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  LinkSimpleIcon,
  PaperPlaneTiltIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  deleteOrgInvitationAction,
  resendOrgInvitationAction,
} from "../actions";

export function InvitationRowActions({
  invitationId,
  status,
}: {
  invitationId: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openDelete, setOpenDelete] = useState(false);

  const isPendingStatus = status === "pending";

  async function onCopy() {
    const url = `${window.location.origin}/accept-invitation?invitationId=${encodeURIComponent(invitationId)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado al portapapeles.");
    } catch {
      toast.error("No pudimos copiar el link. Cópialo manualmente.");
    }
  }

  function onResend() {
    startTransition(async () => {
      const result = await resendOrgInvitationAction(invitationId);
      if (result.ok) toast.success("Invitación reenviada.");
      else toast.error(result.error);
    });
  }

  function onDelete() {
    startTransition(async () => {
      const result = await deleteOrgInvitationAction(invitationId);
      if (result.ok) {
        toast.success("Invitación eliminada.");
        setOpenDelete(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={onCopy}
        title="Copiar link"
        disabled={!isPendingStatus}
      >
        <LinkSimpleIcon />
        <span className="sr-only">Copiar link</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onResend}
        title="Reenviar"
        disabled={!isPendingStatus || isPending}
      >
        <PaperPlaneTiltIcon />
        <span className="sr-only">Reenviar</span>
      </Button>
      <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            title="Eliminar"
            disabled={!isPendingStatus || isPending}
          >
            <TrashIcon />
            <span className="sr-only">Eliminar</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar invitación</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El link enviado dejará de
              funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                onDelete();
              }}
              disabled={isPending}
            >
              {isPending ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
