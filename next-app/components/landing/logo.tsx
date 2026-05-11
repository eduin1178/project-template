import Image from "next/image";
import { siteContent } from "@/content/landing";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function Logo({ className }: Props) {
  const { name, logo } = siteContent.brand;

  return (
    <span
      className={cn("inline-flex items-center", className)}
      aria-label={name}
    >
      <span className="sr-only">{name}</span>

      {/* Mobile */}
      <span className="inline-flex sm:hidden">
        <Image
          src={logo.mobile}
          alt={name}
          width={32}
          height={32}
          className="h-8 w-auto dark:hidden"
          priority
        />
        <Image
          src={logo.mobileDark}
          alt={name}
          width={32}
          height={32}
          className="hidden h-8 w-auto dark:inline"
          priority
        />
      </span>

      {/* Desktop */}
      <span className="hidden sm:inline-flex">
        <Image
          src={logo.horizontal}
          alt={name}
          width={140}
          height={32}
          className="h-8 w-auto dark:hidden"
          priority
        />
        <Image
          src={logo.horizontalDark}
          alt={name}
          width={140}
          height={32}
          className="hidden h-8 w-auto dark:inline"
          priority
        />
      </span>
    </span>
  );
}
