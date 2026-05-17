import { Section } from "./section";
import { RequestDemoButton } from "./request-demo-button";
import { finalCtaContent } from "@/content/landing";

export function FinalCta() {
  return (
    <Section id="contacto">
      <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 overflow-hidden rounded-4xl border border-primary/20 bg-linear-to-br from-primary/10 via-card to-primary/5 p-8 text-center shadow-lg shadow-primary/5 sm:p-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30 bg-[radial-gradient(var(--color-primary)_1px,transparent_1px)] bg-size-[20px_20px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_0%,transparent_70%)]"
        />
        <div className="relative flex flex-col items-center gap-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium tracking-wide text-primary uppercase">
            <span className="size-1.5 rounded-full bg-primary" />
            {finalCtaContent.eyebrow}
          </span>
          <h2 className="max-w-2xl font-heading text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
            {finalCtaContent.title}
          </h2>
          <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
            {finalCtaContent.subtitle}
          </p>
          <RequestDemoButton size="lg" label={finalCtaContent.cta} />
        </div>
      </div>
    </Section>
  );
}
