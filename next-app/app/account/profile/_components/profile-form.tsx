"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { updateProfileAction } from "../actions";

const schema = z.object({
  name: z.string().trim().min(1, "El nombre no puede estar vacío."),
  image: z
    .string()
    .trim()
    .url("Debe ser una URL válida.")
    .or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export function ProfileForm({
  initialName,
  initialImage,
}: {
  initialName: string;
  initialImage: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: initialName, image: initialImage },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const result = await updateProfileAction(values);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Perfil actualizado.");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL de avatar (opcional)</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://…"
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Guardando…" : "Guardar cambios"}
        </Button>
      </form>
    </Form>
  );
}
