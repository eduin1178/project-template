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
      <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {howItWorksContent.steps.map((step) => (
          <li
            key={step.number}
            className="relative rounded-3xl bg-card p-6 ring-1 ring-foreground/10"
          >
            <span className="font-heading text-3xl font-semibold text-primary">
              {step.number}
            </span>
            <h3 className="mt-3 font-heading text-lg font-medium text-foreground">
              {step.title}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
