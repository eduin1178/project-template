import Link from "next/link";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { NewOrganizationForm } from "./new-organization-form";

export const metadata = { title: "Nueva institución — Docentix" };

export default function NewOrganizationPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/super/organizations">
          <CaretLeftIcon />
          Volver a instituciones
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Crear institución</CardTitle>
          <CardDescription>
            Completa los datos de la institución y de su administrador. Le
            enviaremos una invitación al correo indicado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewOrganizationForm />
        </CardContent>
      </Card>
    </div>
  );
}
