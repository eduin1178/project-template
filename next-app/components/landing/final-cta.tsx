import { Section } from "./section";
import { RequestDemoButton } from "./request-demo-button";
import { finalCtaContent } from "@/content/landing";

export function FinalCta() {
  return (
    <Section id="contacto" className="bg-primary/5">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 rounded-3xl bg-card p-8 text-center ring-1 ring-foreground/10 sm:p-12">
        <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {finalCtaContent.title}
        </h2>
        <p className="text-base text-muted-foreground sm:text-lg">
          {finalCtaContent.subtitle}
        </p>
        <RequestDemoButton size="lg" label={finalCtaContent.cta} />
      </div>
    </Section>
  );
}
