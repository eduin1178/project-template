import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { Section, SectionHeader } from "./section";
import { painsContent } from "@/content/landing";

export function Pains() {
  return (
    <Section id="dolores" className="bg-muted/30">
      <SectionHeader
        eyebrow={painsContent.eyebrow}
        title={painsContent.title}
        subtitle={painsContent.subtitle}
      />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {painsContent.items.map((item) => (
          <div
            key={item.title}
            className="group relative flex h-full flex-col gap-3 rounded-2xl border border-border/60 bg-card p-6 transition-shadow hover:shadow-md"
          >
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <WarningCircleIcon size={20} weight="duotone" aria-hidden />
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
