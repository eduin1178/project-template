import { Section, SectionHeader } from "./section";
import { SectionIcon } from "./icon";
import { featuresContent } from "@/content/landing";

export function Features() {
  return (
    <Section id="caracteristicas" className="bg-muted/30">
      <SectionHeader
        eyebrow={featuresContent.eyebrow}
        title={featuresContent.title}
        subtitle={featuresContent.subtitle}
      />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featuresContent.items.map((item) => (
          <div
            key={item.title}
            className="group relative flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-6 transition-shadow hover:shadow-md"
          >
            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
              <SectionIcon name={item.icon} size={22} />
            </span>
            <h3 className="font-heading text-base font-medium text-foreground">
              {item.title}
            </h3>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
