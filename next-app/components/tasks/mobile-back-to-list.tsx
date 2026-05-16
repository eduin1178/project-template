import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";

/**
 * Botón visible solo en mobile (lg:hidden) para volver del detalle a la lista,
 * preservando el querystring (filtros vigentes).
 */
export function MobileBackToList({
  href,
}: {
  href: string;
}) {
  return (
    <div className="border-b px-3 py-2 lg:hidden">
      <Button asChild variant="ghost" size="sm">
        <Link href={href}>
          <ArrowLeftIcon />
          Volver a la lista
        </Link>
      </Button>
    </div>
  );
}
