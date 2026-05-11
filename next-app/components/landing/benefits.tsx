import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { Section, SectionHeader } from "./section";
import { benefitsContent } from "@/content/landing";

export function Benefits() {
  return (
    <Section id="beneficios">
      <SectionHeader
        eyebrow={benefitsContent.eyebrow}
        title={benefitsContent.title}
      />
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {benefitsContent.items.map((b) => (
          <div
            key={b.title}
            className="flex items-start gap-3 rounded-2xl bg-card p-5 ring-1 ring-foreground/10"
          >
            <CheckCircleIcon
              size={24}
              weight="duotone"
              className="mt-1 shrink-0 text-primary"
              aria-hidden
            />
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
