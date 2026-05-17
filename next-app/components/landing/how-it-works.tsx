import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { Section, SectionHeader } from "./section";
import { howItWorksContent } from "@/content/landing";

export function HowItWorks() {
  return (
    <Section id="como-funciona">
      <SectionHeader
        eyebrow={howItWorksContent.eyebrow}
        title={howItWorksContent.title}
        subtitle={howItWorksContent.subtitle}
      />
      <ol className="relative mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {howItWorksContent.steps.map((step, idx) => {
          const isLast = idx === howItWorksContent.steps.length - 1;
          return (
            <li
              key={step.number}
              className="relative flex flex-col gap-3 rounded-3xl border border-border/60 bg-card p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary/10 font-heading text-sm font-semibold text-primary">
                  {step.number}
                </span>
                {!isLast && (
                  <span
                    aria-hidden
                    className="hidden flex-1 items-center text-primary/40 lg:flex"
                  >
                    <span className="h-px flex-1 bg-linear-to-r from-primary/30 to-transparent" />
                    <ArrowRightIcon size={14} weight="bold" />
                  </span>
                )}
              </div>
              <h3 className="font-heading text-lg font-medium text-foreground">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
