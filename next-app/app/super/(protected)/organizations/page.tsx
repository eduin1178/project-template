import Link from "next/link";
import { BuildingsIcon, PlusIcon } from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { listOrganizations } from "./actions";

export const metadata = { title: "Instituciones — Docentix" };
export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function OrganizationsPage() {
  const orgs = await listOrganizations();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Instituciones</h1>
          <p className="text-muted-foreground text-sm">
            Crea y administra las instituciones de la plataforma.
          </p>
        </div>
        {orgs.length > 0 ? (
          <Button asChild>
            <Link href="/super/organizations/new">
              <PlusIcon />
              Nueva institución
            </Link>
          </Button>
        ) : null}
      </header>

      {orgs.length === 0 ? (
        <EmptyState
          icon={<BuildingsIcon className="size-6" />}
          title="Aún no tienes instituciones"
          description="Crea la primera institución e invita a su administrador para empezar."
          action={
            <Button asChild>
              <Link href="/super/organizations/new">
                <PlusIcon />
                Crear institución
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="bg-card overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Creada</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {org.slug}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {dateFormatter.format(org.createdAt)}
                  </TableCell>
                  <TableCell>
                    {org.hasAdmin ? (
                      <Badge variant="secondary">Activa</Badge>
                    ) : (
                      <Badge variant="destructive">Sin admin</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/super/organizations/${org.id}`}>
                        Ver detalle
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
