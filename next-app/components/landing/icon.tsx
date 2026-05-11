import type { ComponentType } from "react";
import {
  BellIcon,
  CalendarCheckIcon,
  ChalkboardTeacherIcon,
  ChartLineIcon,
  ChatsCircleIcon,
  ClipboardTextIcon,
  DeviceMobileIcon,
  FunnelIcon,
  LightningIcon,
  LockIcon,
  ShieldCheckIcon,
  TagIcon,
  UsersIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { IconProps } from "@phosphor-icons/react";
import type { IconName } from "@/content/landing";

const map: Record<IconName, ComponentType<IconProps>> = {
  ClipboardText: ClipboardTextIcon,
  CalendarCheck: CalendarCheckIcon,
  ChalkboardTeacher: ChalkboardTeacherIcon,
  Bell: BellIcon,
  ChartLine: ChartLineIcon,
  Users: UsersIcon,
  ShieldCheck: ShieldCheckIcon,
  Lightning: LightningIcon,
  ChatsCircle: ChatsCircleIcon,
  Tag: TagIcon,
  Funnel: FunnelIcon,
  Lock: LockIcon,
  DeviceMobile: DeviceMobileIcon,
};

export function SectionIcon({
  name,
  ...props
}: { name: IconName } & IconProps) {
  const Cmp = map[name];
  return <Cmp aria-hidden weight="duotone" {...props} />;
}
