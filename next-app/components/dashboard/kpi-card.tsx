import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  variant?: "default" | "alert";
  className?: string;
};

export function KpiCard({
  label,
  value,
  hint,
  icon,
  variant = "default",
  className,
}: KpiCardProps) {
  return (
    <Card
      size="sm"
      className={cn(
        variant === "alert" &&
          "bg-destructive/5 ring-destructive/30 text-destructive-foreground",
        className,
      )}
    >
      <CardContent className="px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p
              className={cn(
                "text-xs font-medium uppercase tracking-wide",
                variant === "alert"
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {label}
            </p>
            <p
              className={cn(
                "text-3xl font-semibold leading-none",
                variant === "alert" && "text-destructive",
              )}
            >
              {value}
            </p>
            {hint ? (
              <p className="text-muted-foreground text-xs">{hint}</p>
            ) : null}
          </div>
          {icon ? (
            <div
              className={cn(
                "flex size-9 items-center justify-center rounded-lg",
                variant === "alert"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {icon}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
