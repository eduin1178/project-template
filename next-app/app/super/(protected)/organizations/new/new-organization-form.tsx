"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  createOrganizationWithAdminAction,
  type CreateOrgFieldError,
} from "../actions";

const slugRegex = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const schema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio."),
  slug: z
    .string()
    .trim()
    .min(2, "El slug debe tener al menos 2 caracteres.")
    .max(60, "El slug es demasiado largo.")
    .regex(
      slugRegex,
      "Solo minúsculas, números y guiones. No puede empezar ni terminar con guion.",
    ),
  adminName: z.string().trim().min(1, "El nombre del admin es obligatorio."),
  adminEmail: z.string().trim().email("Ingresa un email válido."),
});

type FormValues = z.infer<typeof schema>;

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function NewOrganizationForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [slugTouched, setSlugTouched] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "", adminName: "", adminEmail: "" },
  });

  function onNameChange(value: string) {
    form.setValue("name", value, { shouldValidate: true });
    if (!slugTouched) {
      form.setValue("slug", slugify(value), { shouldValidate: true });
    }
  }

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await createOrganizationWithAdminAction(values);
      if (!result.ok) {
        if (result.field) {
          form.setError(result.field as CreateOrgFieldError, {
            message: result.error,
          });
        } else {
          toast.error(result.error);
        }
        return;
      }
      if (!result.emailSent) {
        toast.warning(
          "Organización creada, pero no pudimos enviar el email. Copia el link desde el detalle.",
        );
      } else {
        toast.success("Organización creada e invitación enviada.");
      }
      router.push(`/super/organizations/${result.organizationId}`);
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la organización</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Colegio Esperanza"
                  onChange={(e) => onNameChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="colegio-esperanza"
                  onChange={(e) => {
                    setSlugTouched(true);
                    field.onChange(e);
                  }}
                />
              </FormControl>
              <FormDescription>
                Identificador único en URL. Solo minúsculas, números y guiones.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border-t pt-6">
          <h3 className="text-sm font-medium">Administrador de la organización</h3>
          <p className="text-muted-foreground text-xs">
            Recibirá una invitación por correo para crear su cuenta.
          </p>
        </div>

        <FormField
          control={form.control}
          name="adminName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del admin</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ana Pérez" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="adminEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email del admin</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  placeholder="ana@colegio-esperanza.edu"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Creando…" : "Crear organización"}
        </Button>
      </form>
    </Form>
  );
}
