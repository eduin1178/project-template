"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { FunnelSimpleIcon } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function FiltersTrigger({
  activeCount,
  children,
}: {
  activeCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Estado del Sheet derivado del pathname: cuando el usuario aplica un filtro
  // se navega a una nueva URL, lo que cambia el `key` y remonta el `Sheet`,
  // resetando su estado interno a cerrado. Esto evita usar `setState` dentro
  // de un `useEffect` (anti-patrón en React 19).
  return <FiltersSheet key={pathname} activeCount={activeCount}>{children}</FiltersSheet>;
}

function FiltersSheet({
  activeCount,
  children,
}: {
  activeCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Abrir filtros"
        >
          <FunnelSimpleIcon />
          Filtros
          {activeCount > 0 ? (
            <Badge variant="secondary" className="ml-1">
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 overflow-y-auto p-4">
        <SheetHeader className="mb-4 px-0">
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}
