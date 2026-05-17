import { Section, SectionHeader } from "./section";
import { SectionIcon } from "./icon";
import { securityContent } from "@/content/landing";

export function Security() {
  return (
    <Section id="seguridad">
      <SectionHeader
        eyebrow={securityContent.eyebrow}
        title={securityContent.title}
        subtitle={securityContent.subtitle}
      />
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {securityContent.bullets.map((b) => (
          <div
            key={b.title}
            className="flex items-start gap-4 rounded-3xl border border-border/60 bg-card p-6 transition-shadow hover:shadow-md"
          >
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <SectionIcon name={b.icon} size={24} />
            </span>
            <div>
              <h3 className="font-heading text-base font-medium text-foreground">
                {b.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {b.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
