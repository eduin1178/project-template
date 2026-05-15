"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TaskStatus } from "@/lib/db/schema/task";
import { changeTaskStatus } from "@/lib/tasks/actions";
import {
  STATUS_CHANGE_COMMENT_MAX,
  STATUS_CHANGE_COMMENT_MIN,
} from "@/lib/tasks/schemas";

const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Pendiente",
  in_progress: "En curso",
  done: "Hecha",
};

const ALLOWED_TRANSITIONS: Record<TaskStatus, ReadonlyArray<TaskStatus>> = {
  pending: ["in_progress"],
  in_progress: ["pending", "done"],
  done: ["pending", "in_progress"],
};

export function ChangeStatusDialog({
  taskId,
  currentStatus,
  trigger,
  presetStatus,
  open: openProp,
  onOpenChange,
}: {
  taskId: string;
  currentStatus: TaskStatus;
  trigger?: React.ReactNode;
  presetStatus?: TaskStatus;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  const defaultNew = presetStatus && allowed.includes(presetStatus)
    ? presetStatus
    : allowed[0];
  const [newStatus, setNewStatus] = useState<TaskStatus>(defaultNew);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const trimmedLength = body.trim().length;
  const tooShort = trimmedLength < STATUS_CHANGE_COMMENT_MIN;
  const tooLong = trimmedLength > STATUS_CHANGE_COMMENT_MAX;

  function reset() {
    setNewStatus(defaultNew);
    setBody("");
    setError(null);
  }

  function onOpenChangeFallback(next: boolean) {
    setOpen(next);
    if (!next) reset();
    else {
      setNewStatus(defaultNew);
      setBody("");
      setError(null);
    }
  }

  function onConfirm() {
    setError(null);
    if (tooShort || tooLong) {
      setError(
        `Justifica el cambio con entre ${STATUS_CHANGE_COMMENT_MIN} y ${STATUS_CHANGE_COMMENT_MAX} caracteres.`,
      );
      return;
    }
    startTransition(async () => {
      const result = await changeTaskStatus({
        taskId,
        newStatus,
        commentBody: body,
      });
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Estado actualizado.");
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChangeFallback}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambia el estado</DialogTitle>
          <DialogDescription>
            Elige el estado nuevo y justifica el cambio. Tu comentario quedará
            registrado en el historial de la tarea.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="change-status-new">Estado nuevo</Label>
          <Select
            value={newStatus}
            onValueChange={(v) => setNewStatus(v as TaskStatus)}
          >
            <SelectTrigger id="change-status-new">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowed.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            Estado actual: {STATUS_LABEL[currentStatus]}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="change-status-body">
            Justifica el cambio (mínimo {STATUS_CHANGE_COMMENT_MIN} caracteres)
          </Label>
          <Textarea
            id="change-status-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Cuenta por qué cambias el estado: qué se hizo, qué falta, qué se reabrió."
            rows={5}
            className="min-h-30 max-h-60 resize-y"
          />
          <div className="text-muted-foreground flex justify-between text-xs">
            <span>
              {trimmedLength} / {STATUS_CHANGE_COMMENT_MAX}
            </span>
            <span>
              {tooShort
                ? `Faltan ${STATUS_CHANGE_COMMENT_MIN - trimmedLength} caracteres`
                : tooLong
                  ? `Sobran ${trimmedLength - STATUS_CHANGE_COMMENT_MAX} caracteres`
                  : "Listo para confirmar"}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isPending || tooShort || tooLong}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
