import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function personInitials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "";
  if (!source) return "??";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function personLabel(name: string | null, email: string | null): string {
  return name?.trim() || email?.trim() || "Sin nombre";
}

export function UserAvatar({
  name,
  email,
  image,
  className,
  fallbackClassName,
}: {
  name: string | null;
  email: string | null;
  image: string | null;
  className?: string;
  fallbackClassName?: string;
}) {
  const label = personLabel(name, email);
  const initials = personInitials(name, email);
  return (
    <Avatar className={cn(className)}>
      {image ? <AvatarImage src={image} alt={label} /> : null}
      <AvatarFallback className={cn(fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
