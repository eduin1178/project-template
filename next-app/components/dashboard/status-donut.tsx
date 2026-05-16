"use client";

import { Pie, PieChart, Cell } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  pending: {
    label: "Pendientes",
    color: "var(--chart-1)",
  },
  inProgress: {
    label: "En curso",
    color: "var(--chart-2)",
  },
  done: {
    label: "Hechas",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export function StatusDonut({
  pending,
  inProgress,
  done,
}: {
  pending: number;
  inProgress: number;
  done: number;
}) {
  const total = pending + inProgress + done;

  if (total === 0) {
    return (
      <div className="text-muted-foreground flex h-[220px] items-center justify-center rounded-lg border border-dashed text-sm">
        Aún no hay tareas activas para visualizar
      </div>
    );
  }

  const data = [
    { name: "pending", value: pending, fill: "var(--color-pending)" },
    { name: "inProgress", value: inProgress, fill: "var(--color-inProgress)" },
    { name: "done", value: done, fill: "var(--color-done)" },
  ].filter((item) => item.value > 0);

  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square max-h-[220px]"
    >
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={85}
          strokeWidth={2}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Pie>
        <ChartLegend
          content={<ChartLegendContent nameKey="name" />}
          className="-translate-y-2 flex-wrap gap-2"
        />
      </PieChart>
    </ChartContainer>
  );
}
