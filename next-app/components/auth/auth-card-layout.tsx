import Image from "next/image";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const LOGO_WIDTH = 180;
const LOGO_HEIGHT = 48;

export function AuthCardLayout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="bg-background relative flex min-h-screen items-center justify-center px-4 py-10">
      {/* Fondo decorativo: patrón vectorial con motivos educativos.
          Capa absolute para no afectar el flujo; baja opacidad para que
          la card siga siendo el foco. Dark mode atenúa aún más. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-25"
        style={{
          backgroundImage: "url(/images/auth-bg-pattern.svg)",
          backgroundRepeat: "repeat",
          backgroundSize: "320px 320px",
        }}
      />
      {/* Velo radial: aclara el centro para que la card respire. */}
      <div
        aria-hidden
        className="from-background/80 via-background/40 pointer-events-none absolute inset-0 bg-gradient-radial to-transparent"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at center, var(--background) 0%, color-mix(in oklab, var(--background) 60%, transparent) 35%, transparent 70%)",
        }}
      />
      <div className="relative flex w-full max-w-md flex-col items-center gap-6">
        <div aria-label="Docentix">
          <Image
            src="/images/logo-horizontal.png"
            alt="Docentix"
            width={LOGO_WIDTH}
            height={LOGO_HEIGHT}
            priority
            className="block h-12 w-auto dark:hidden"
          />
          <Image
            src="/images/logo-horizontal-dark.png"
            alt="Docentix"
            width={LOGO_WIDTH}
            height={LOGO_HEIGHT}
            priority
            className="hidden h-12 w-auto dark:block"
          />
        </div>
        <Card className={cn("w-full", className)}>{children}</Card>
      </div>
    </div>
  );
}
