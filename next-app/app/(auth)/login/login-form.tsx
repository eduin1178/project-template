"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { authClient } from "@/lib/auth/client";
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

const schema = z.object({
  email: z.string().email("Ingresa un email válido."),
  password: z.string().min(1, "Ingresa tu contraseña."),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? undefined;
  const verified = searchParams.get("verified") === "1";

  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const result = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });
    if (result.error) {
      setError(result.error.message ?? "No pudimos iniciar tu sesión.");
      return;
    }
    const target =
      next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : "/post-login";
    router.push(target);
    router.refresh();
  }

  async function onGoogle() {
    setError(null);
    await authClient.signIn.social({
      provider: "google",
      callbackURL: next ?? "/post-login",
    });
  }

  return (
    <div className="space-y-6">
      {verified ? (
        <Alert>
          <AlertDescription>
            Tu correo quedó verificado. Inicia sesión para continuar.
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo electrónico</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="tu@correo.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña</FormLabel>
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

          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? "Iniciando sesión…"
              : "Iniciar sesión"}
          </Button>
        </form>
      </Form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background text-muted-foreground px-2">
            o continúa con
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onGoogle}
      >
        Continuar con Google
      </Button>

      <div className="text-muted-foreground text-center text-sm">
        <Link href="/forgot-password" className="hover:text-foreground underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
    </div>
  );
}
