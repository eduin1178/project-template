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

import { changePasswordAction, setPasswordAction } from "../actions";

const changeSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresa tu contraseña actual."),
    newPassword: z
      .string()
      .min(8, "La nueva contraseña debe tener al menos 8 caracteres."),
    confirmPassword: z.string().min(1, "Confirma tu nueva contraseña."),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

const setSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres."),
    confirmPassword: z.string().min(1, "Confirma tu contraseña."),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export function PasswordSection({ mode }: { mode: "change" | "set" }) {
  if (mode === "change") return <ChangeForm />;
  return <SetForm />;
}

function ChangeForm() {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof changeSchema>>({
    resolver: zodResolver(changeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof changeSchema>) {
    setError(null);
    const result = await changePasswordAction({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Contraseña actualizada. Otras sesiones quedaron cerradas.");
    form.reset();
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
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña actual</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nueva contraseña</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar nueva contraseña</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Actualizando…" : "Cambiar contraseña"}
        </Button>
      </form>
    </Form>
  );
}

function SetForm() {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof setSchema>>({
    resolver: zodResolver(setSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: z.infer<typeof setSchema>) {
    setError(null);
    const result = await setPasswordAction({ newPassword: values.newPassword });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Contraseña configurada. Ya puedes iniciar sesión con email.");
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <p className="text-muted-foreground text-sm">
          Tu cuenta actualmente solo permite iniciar sesión con un proveedor
          externo. Establece una contraseña para acceder también con email.
        </p>
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nueva contraseña</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar contraseña</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting
            ? "Estableciendo…"
            : "Establecer contraseña"}
        </Button>
      </form>
    </Form>
  );
}
