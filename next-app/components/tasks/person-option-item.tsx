export function PersonOptionItem({
  name,
  email,
}: {
  name: string | null;
  email: string | null;
}) {
  const trimmedName = name?.trim() || null;
  const trimmedEmail = email?.trim() || null;
  const primary = trimmedName ?? trimmedEmail ?? "Sin nombre";
  const secondary = trimmedName && trimmedEmail ? trimmedEmail : null;
  return (
    <span className="flex flex-col leading-tight">
      <span className="text-sm">{primary}</span>
      {secondary ? (
        <span className="text-muted-foreground text-xs">{secondary}</span>
      ) : null}
    </span>
  );
}
