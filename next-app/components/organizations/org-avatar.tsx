import { cn } from "@/lib/utils";

export function OrgAvatar({
  name,
  logo,
  className,
}: {
  name: string;
  logo: string | null | undefined;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-muted flex shrink-0 items-center justify-center overflow-hidden rounded-md text-sm font-medium",
        className,
      )}
    >
      {logo ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={logo} alt="" className="size-full object-cover" />
      ) : (
        name.slice(0, 2).toUpperCase()
      )}
    </div>
  );
}
