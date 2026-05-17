import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { Section, SectionHeader } from "./section";
import { benefitsContent } from "@/content/landing";

export function Benefits() {
  return (
    <Section id="beneficios" className="bg-muted/30">
      <SectionHeader
        eyebrow={benefitsContent.eyebrow}
        title={benefitsContent.title}
      />
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {benefitsContent.items.map((b) => (
          <div
            key={b.title}
            className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card p-5 transition-shadow hover:shadow-md"
          >
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CheckCircleIcon size={22} weight="duotone" aria-hidden />
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
