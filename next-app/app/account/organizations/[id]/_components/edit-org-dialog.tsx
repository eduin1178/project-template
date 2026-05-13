"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { OrgAvatar } from "@/components/organizations/org-avatar";

import {
  updateOrganizationAction,
  uploadOrganizationLogoAction,
} from "../actions";

const schema = z.object({
  name: z.string().trim().min(1, "El nombre no puede estar vacío."),
});

type FormValues = z.infer<typeof schema>;

const MAX_LOGO_BYTES = 1024 * 1024;
const ALLOWED_LOGO_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

export function EditOrgDialog({
  organizationId,
  slug,
  initialName,
  currentLogo,
}: {
  organizationId: string;
  slug: string;
  initialName: string;
  currentLogo: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: initialName },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const result = await updateOrganizationAction({
      organizationId,
      name: values.name,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Organización actualizada.");
    setOpen(false);
    router.refresh();
  }

  function onLogoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_LOGO_MIME.has(file.type)) {
      toast.error("Formato no soportado. Usa PNG, JPEG, WebP o SVG.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("El archivo supera el tamaño máximo de 1 MB.");
      event.target.value = "";
      return;
    }
    const formData = new FormData();
    formData.set("organizationId", organizationId);
    formData.set("file", file);
    startUpload(async () => {
      const result = await uploadOrganizationLogoAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Logo actualizado.");
      router.refresh();
    });
    event.target.value = "";
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar organización</DialogTitle>
          <DialogDescription>
            El identificador <span className="font-mono">{slug}</span> no se puede modificar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm font-medium">Logo</p>
          <div className="flex items-center gap-4">
            <OrgAvatar
              name={initialName}
              logo={currentLogo}
              className="size-16"
            />
            <div className="flex-1 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={onLogoSelected}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? "Subiendo…" : currentLogo ? "Reemplazar logo" : "Subir logo"}
              </Button>
              <p className="text-muted-foreground text-xs">
                PNG, JPEG, WebP o SVG. Máximo 1 MB.
              </p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 pt-2"
          >
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Guardando…" : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
