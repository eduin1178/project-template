"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";

import type { z } from "zod";
import {
  demoRequestSchema,
  type DemoRequestInput,
} from "@/lib/validation/demo-request";
import { useRequestDemo } from "./request-demo-context";

type FormValues = z.input<typeof demoRequestSchema>;
import { requestDemoForm } from "@/content/landing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

export function RequestDemoForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, setState] = React.useState<SubmitState>({ status: "idle" });
  const { setOpen } = useRequestDemo();
  const f = requestDemoForm.fields;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues, unknown, DemoRequestInput>({
    resolver: zodResolver(demoRequestSchema),
    defaultValues: {
      fullName: "",
      institutionalEmail: "",
      institutionName: "",
      department: "",
      municipality: "",
      role: undefined,
      teacherCount: undefined,
      message: "",
    },
  });

  const roleValue = watch("role");
  const departmentValue = watch("department");

  async function onSubmit(values: DemoRequestInput) {
    setState({ status: "submitting" });
    try {
      const res = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        setState({ status: "error", message: requestDemoForm.errorGeneric });
        return;
      }
      setState({ status: "success" });
      reset();
      onSuccess?.();
    } catch {
      setState({ status: "error", message: requestDemoForm.errorGeneric });
    }
  }

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 py-6 text-center"
      >
        <CheckCircleIcon
          size={40}
          weight="duotone"
          className="text-primary"
          aria-hidden
        />
        <p className="text-sm text-foreground">{requestDemoForm.success}</p>
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => {
            setState({ status: "idle" });
            setOpen(false);
          }}
        >
          Cerrar
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="grid gap-4"
      aria-busy={state.status === "submitting"}
    >
      <FormField
        id="fullName"
        label={f.fullName.label}
        error={errors.fullName?.message}
      >
        <Input
          id="fullName"
          autoComplete="name"
          placeholder={f.fullName.placeholder}
          aria-invalid={!!errors.fullName}
          {...register("fullName")}
        />
      </FormField>

      <FormField
        id="institutionalEmail"
        label={f.institutionalEmail.label}
        error={errors.institutionalEmail?.message}
      >
        <Input
          id="institutionalEmail"
          type="email"
          autoComplete="email"
          placeholder={f.institutionalEmail.placeholder}
          aria-invalid={!!errors.institutionalEmail}
          {...register("institutionalEmail")}
        />
      </FormField>

      <FormField
        id="institutionName"
        label={f.institutionName.label}
        error={errors.institutionName?.message}
      >
        <Input
          id="institutionName"
          autoComplete="organization"
          placeholder={f.institutionName.placeholder}
          aria-invalid={!!errors.institutionName}
          {...register("institutionName")}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          id="department"
          label={f.department.label}
          error={errors.department?.message}
        >
          <Select
            value={departmentValue ?? ""}
            onValueChange={(v) =>
              setValue("department", v, { shouldValidate: true })
            }
          >
            <SelectTrigger id="department" aria-invalid={!!errors.department}>
              <SelectValue placeholder={f.department.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {f.department.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          id="municipality"
          label={f.municipality.label}
          error={errors.municipality?.message}
        >
          <Input
            id="municipality"
            autoComplete="address-level2"
            placeholder={f.municipality.placeholder}
            aria-invalid={!!errors.municipality}
            {...register("municipality")}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="role" label={f.role.label} error={errors.role?.message}>
          <Select
            value={roleValue ?? ""}
            onValueChange={(v) =>
              setValue("role", v as FormValues["role"], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger id="role" aria-invalid={!!errors.role}>
              <SelectValue placeholder={f.role.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {f.role.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          id="teacherCount"
          label={f.teacherCount.label}
          error={errors.teacherCount?.message}
        >
          <Input
            id="teacherCount"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder={f.teacherCount.placeholder}
            aria-invalid={!!errors.teacherCount}
            {...register("teacherCount")}
          />
        </FormField>
      </div>

      <FormField
        id="message"
        label={f.message.label}
        error={errors.message?.message}
      >
        <Textarea
          id="message"
          rows={4}
          placeholder={f.message.placeholder}
          aria-invalid={!!errors.message}
          {...register("message")}
        />
      </FormField>

      {state.status === "error" && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-2xl bg-destructive/10 p-3 text-sm text-destructive"
        >
          <WarningCircleIcon size={18} weight="bold" aria-hidden />
          <span>{state.message}</span>
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={state.status === "submitting"}
        className="w-full"
      >
        {state.status === "submitting"
          ? requestDemoForm.submitting
          : requestDemoForm.submit}
      </Button>
    </form>
  );
}

function FormField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      <span
        className={cn(
          "min-h-4 text-xs text-destructive",
          !error && "sr-only"
        )}
        role={error ? "alert" : undefined}
      >
        {error}
      </span>
    </div>
  );
}
