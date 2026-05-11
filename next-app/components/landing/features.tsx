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
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featuresContent.items.map((item) => (
          <div
            key={item.title}
            className="flex flex-col gap-3 rounded-3xl bg-card p-6 ring-1 ring-foreground/10"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
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
