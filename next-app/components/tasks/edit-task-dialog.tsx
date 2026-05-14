"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateTaskContent } from "@/lib/tasks/actions";
import type { TaskVisibility } from "@/lib/db/schema/task";

import type { TaskCapabilities } from "./capabilities";

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "El título no puede estar vacío.")
    .max(200, "El título no puede superar los 200 caracteres."),
  description: z
    .string()
    .trim()
    .max(5000, "La descripción no puede superar los 5000 caracteres.")
    .optional(),
  dueAt: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function toInputValue(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EditTaskDialog({
  task,
  capabilities,
  open,
  onOpenChange,
}: {
  task: {
    id: string;
    title: string;
    description: string | null;
    dueAt: Date | null;
    visibility: TaskVisibility;
  };
  capabilities: Pick<TaskCapabilities, "canEditContent" | "canEditDueAt">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: task.title,
      description: task.description ?? "",
      dueAt: toInputValue(task.dueAt),
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: task.title,
        description: task.description ?? "",
        dueAt: toInputValue(task.dueAt),
      });
      setError(null);
    }
  }, [open, task, form]);

  async function onSubmit(values: FormValues) {
    setError(null);
    const payload: Parameters<typeof updateTaskContent>[0] = {
      taskId: task.id,
    };

    if (capabilities.canEditContent) {
      if (values.title.trim() !== task.title) {
        payload.title = values.title.trim();
      }
      const desc = values.description?.trim() ?? "";
      const currentDesc = task.description ?? "";
      if (desc !== currentDesc) {
        payload.description = desc.length > 0 ? desc : undefined;
      }
    }

    if (capabilities.canEditDueAt) {
      const currentDueAt = task.dueAt ? task.dueAt.getTime() : null;
      const nextDueAt = values.dueAt ? new Date(values.dueAt).getTime() : null;
      if (currentDueAt !== nextDueAt) {
        payload.dueAt = values.dueAt ? new Date(values.dueAt) : null;
      }
    }

    if (
      payload.title === undefined &&
      payload.description === undefined &&
      payload.dueAt === undefined
    ) {
      onOpenChange(false);
      return;
    }

    const result = await updateTaskContent(payload);
    if (!result.ok) {
      setError(result.error ?? "No pudimos guardar los cambios.");
      return;
    }
    toast.success("Tarea actualizada.");
    onOpenChange(false);
    router.refresh();
  }

  const showDueAt = capabilities.canEditDueAt;
  const contentDisabled = !capabilities.canEditContent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edita la tarea</DialogTitle>
          <DialogDescription>
            Actualiza los datos visibles según tus permisos.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Título de la tarea"
                      disabled={contentDisabled}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe la tarea (opcional)."
                      rows={8}
                      className="min-h-50 max-h-100 resize-y"
                      disabled={contentDisabled}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showDueAt ? (
              <FormField
                control={form.control}
                name="dueAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plazo</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                Cierra
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
