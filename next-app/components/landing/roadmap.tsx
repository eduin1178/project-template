import { RocketIcon } from "@phosphor-icons/react/dist/ssr";
import { Section, SectionHeader } from "./section";
import { SectionIcon } from "./icon";
import { Badge } from "@/components/ui/badge";
import { roadmapContent } from "@/content/landing";

export function Roadmap() {
  return (
    <Section id="roadmap" className="bg-muted/30">
      <SectionHeader
        eyebrow={roadmapContent.eyebrow}
        title={roadmapContent.title}
        subtitle={roadmapContent.subtitle}
      />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {roadmapContent.items.map((item) => (
          <div
            key={item.name}
            className="relative flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-card/60 p-5"
          >
            <Badge
              variant="secondary"
              className="absolute top-4 right-4 gap-1 bg-primary/10 text-primary"
            >
              <RocketIcon size={12} weight="bold" aria-hidden />
              {roadmapContent.badge}
            </Badge>
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <SectionIcon name={item.icon} size={20} />
            </span>
            <h3 className="pr-20 font-heading text-base font-medium text-foreground">
              {item.name}
            </h3>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
