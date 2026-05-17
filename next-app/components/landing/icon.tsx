import type { ComponentType } from "react";
import {
  BellIcon,
  BuildingsIcon,
  CalendarCheckIcon,
  ChalkboardTeacherIcon,
  ChartLineIcon,
  ChatsCircleIcon,
  CheckSquareIcon,
  ClipboardTextIcon,
  CompassIcon,
  DeviceMobileIcon,
  EnvelopeSimpleIcon,
  FunnelIcon,
  LightningIcon,
  LockIcon,
  PaperclipIcon,
  RocketIcon,
  ShieldCheckIcon,
  SparkleIcon,
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
  CheckSquare: CheckSquareIcon,
  Paperclip: PaperclipIcon,
  Buildings: BuildingsIcon,
  Rocket: RocketIcon,
  Sparkle: SparkleIcon,
  EnvelopeSimple: EnvelopeSimpleIcon,
  Compass: CompassIcon,
};

export function SectionIcon({
  name,
  ...props
}: { name: IconName } & IconProps) {
  const Cmp = map[name];
  return <Cmp aria-hidden weight="duotone" {...props} />;
}
