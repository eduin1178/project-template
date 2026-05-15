"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PlusIcon } from "@phosphor-icons/react";

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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { createTask } from "@/lib/tasks/actions";
import type { OrgMemberOption } from "@/lib/tasks/queries";

const NONE_VALUE = "__none__";

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
  visibility: z.enum(["draft", "active"]),
  dueAt: z.string().optional(),
  responsibleId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function personLabel(name: string | null, email: string | null): string {
  return name?.trim() || email?.trim() || "Sin nombre";
}

function toDatetimeLocal(iso: string): string {
  // Convert ISO server-rendered string into the value format that
  // <input type="datetime-local"> expects: "YYYY-MM-DDTHH:mm" in local TZ.
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function CreateTaskDialog({
  members,
  defaultDueAt,
}: {
  members: OrgMemberOption[];
  defaultDueAt?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialDueAt = defaultDueAt ? toDatetimeLocal(defaultDueAt) : "";
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      visibility: "draft",
      dueAt: initialDueAt,
      responsibleId: NONE_VALUE,
    },
  });

  const visibility = useWatch({ control: form.control, name: "visibility" });

  async function onSubmit(values: FormValues) {
    setError(null);
    const hasResponsible =
      !!values.responsibleId && values.responsibleId !== NONE_VALUE;
    if (values.visibility === "active") {
      if (!values.dueAt) {
        setError("Define un plazo para crear la tarea como activa.");
        return;
      }
      if (!hasResponsible) {
        setError("Define un responsable para crear la tarea como activa.");
        return;
      }
    }
    const result = await createTask({
      title: values.title,
      description: values.description || undefined,
      visibility: values.visibility,
      dueAt: values.dueAt ? new Date(values.dueAt) : undefined,
      responsibleId: hasResponsible ? values.responsibleId : undefined,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Tarea creada.");
    form.reset({
      title: "",
      description: "",
      visibility: "draft",
      dueAt: initialDueAt,
      responsibleId: NONE_VALUE,
    });
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon />
          Nueva tarea
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva tarea</DialogTitle>
          <DialogDescription>
            Crea una tarea para tu organización. Puedes dejarla en borrador y
            activarla más tarde.
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
                    <Input placeholder="Título de la tarea" {...field} />
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
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visibilidad inicial</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Borrador</SelectItem>
                      <SelectItem value="active">Activa</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Plazo
                    {visibility === "active" ? (
                      <span className="text-destructive ml-1">*</span>
                    ) : (
                      <span className="text-muted-foreground ml-1 text-xs font-normal">
                        (opcional en borrador)
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="responsibleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Responsable
                    {visibility === "active" ? (
                      <span className="text-destructive ml-1">*</span>
                    ) : (
                      <span className="text-muted-foreground ml-1 text-xs font-normal">
                        (opcional en borrador)
                      </span>
                    )}
                  </FormLabel>
                  <Select
                    value={field.value ?? NONE_VALUE}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un responsable" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Sin responsable</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {personLabel(m.name, m.email)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={form.formState.isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Crear tarea
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
