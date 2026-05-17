import {
  CheckIcon,
  ChalkboardTeacherIcon,
  ClipboardTextIcon,
  UserCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { ComponentType } from "react";
import type { IconProps } from "@phosphor-icons/react";
import { Section, SectionHeader } from "./section";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { audiencesContent } from "@/content/landing";
import { cn } from "@/lib/utils";

const ROLE_ICON: Record<string, ComponentType<IconProps>> = {
  Rector: UserCircleIcon,
  Coordinador: ClipboardTextIcon,
  Docente: ChalkboardTeacherIcon,
};

export function Audiences() {
  return (
    <Section id="audiencias">
      <SectionHeader
        eyebrow={audiencesContent.eyebrow}
        title={audiencesContent.title}
        subtitle={audiencesContent.subtitle}
      />
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {audiencesContent.roles.map((r, idx) => {
          const Icon = ROLE_ICON[r.role] ?? UserCircleIcon;
          const isMiddle = idx === 1;
          return (
            <Card
              key={r.role}
              className={cn(
                "relative h-full transition-shadow hover:shadow-md",
                isMiddle && "ring-1 ring-primary/30 lg:scale-[1.02]",
              )}
            >
              <CardHeader>
                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon size={24} weight="duotone" aria-hidden />
                </span>
                <CardTitle className="mt-4 text-lg">{r.role}</CardTitle>
                <CardDescription>{r.tagline}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2 text-sm text-foreground">
                  {r.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <CheckIcon
                        size={16}
                        weight="bold"
                        className="mt-0.5 shrink-0 text-primary"
                        aria-hidden
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </Section>
  );
}
