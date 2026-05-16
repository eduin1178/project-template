import { Progress } from "@/components/ui/progress";

export function CompletionBar({
  done,
  created,
}: {
  done: number;
  created: number;
}) {
  if (created === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">
            Cumplimiento últimos 30 días
          </p>
          <p className="text-sm font-medium text-muted-foreground">Sin datos</p>
        </div>
        <Progress value={0} />
      </div>
    );
  }

  const ratio = (done / created) * 100;
  const display = Math.round(ratio);
  const capped = Math.min(100, ratio);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-muted-foreground text-xs uppercase tracking-wide">
          Cumplimiento últimos 30 días
        </p>
        <p className="text-sm font-semibold">{display}%</p>
      </div>
      <Progress value={capped} />
      <p className="text-muted-foreground text-xs">
        {done} completadas sobre {created} creadas en los últimos 30 días.
      </p>
    </div>
  );
}
