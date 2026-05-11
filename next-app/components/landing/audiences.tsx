import { CheckIcon } from "@phosphor-icons/react/dist/ssr";
import { Section, SectionHeader } from "./section";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { audiencesContent } from "@/content/landing";

export function Audiences() {
  return (
    <Section id="audiencias">
      <SectionHeader
        eyebrow={audiencesContent.eyebrow}
        title={audiencesContent.title}
        subtitle={audiencesContent.subtitle}
      />
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {audiencesContent.roles.map((r) => (
          <Card key={r.role} className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">{r.role}</CardTitle>
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
        ))}
      </div>
    </Section>
  );
}
