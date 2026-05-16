import { HardDrives } from "@phosphor-icons/react/dist/ssr";

import { KpiCard } from "./kpi-card";

function bytesToMb(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const mb = bytes / 1024 / 1024;
  return `${(Math.round(mb * 10) / 10).toFixed(1)} MB`;
}

export function StorageCard({
  bytes,
  hint,
}: {
  bytes: number;
  hint?: string;
}) {
  return (
    <KpiCard
      label="Almacenamiento"
      value={bytesToMb(bytes)}
      hint={hint}
      icon={<HardDrives size={20} weight="duotone" />}
    />
  );
}
