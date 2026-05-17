import { QuotesIcon } from "@phosphor-icons/react/dist/ssr";
import { Section, SectionHeader } from "./section";
import { socialProofContent } from "@/content/landing";

export function SocialProof() {
  return (
    <Section id="prueba-social" className="bg-muted/30">
      <SectionHeader
        eyebrow={socialProofContent.eyebrow}
        title={socialProofContent.title}
        subtitle={socialProofContent.subtitle}
      />
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {socialProofContent.testimonials.map((t) => (
          <figure
            key={t.name}
            className="relative flex h-full flex-col gap-4 rounded-3xl border border-border/60 bg-card p-6 transition-shadow hover:shadow-md"
          >
            <QuotesIcon
              size={32}
              weight="fill"
              className="text-primary/30"
              aria-hidden
            />
            <blockquote className="text-base leading-relaxed text-foreground">
              {t.quote}
            </blockquote>
            <figcaption className="mt-auto flex items-center gap-3 border-t border-border/60 pt-4">
              <span
                className="flex size-10 items-center justify-center rounded-full bg-linear-to-br from-primary/20 to-primary/10 text-sm font-semibold text-primary"
                aria-hidden
              >
                {t.name
                  .split(" ")
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")}
              </span>
              <div className="text-xs">
                <div className="font-medium text-foreground">{t.name}</div>
                <div className="text-muted-foreground">
                  {t.role} · {t.institution}
                </div>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}
