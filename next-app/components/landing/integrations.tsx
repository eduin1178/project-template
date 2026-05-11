import { PlugsConnectedIcon } from "@phosphor-icons/react/dist/ssr";
import { Section, SectionHeader } from "./section";
import { integrationsContent } from "@/content/landing";

export function Integrations() {
  return (
    <Section id="integraciones" className="bg-muted/30">
      <SectionHeader
        eyebrow={integrationsContent.eyebrow}
        title={integrationsContent.title}
        subtitle={integrationsContent.subtitle}
      />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {integrationsContent.items.map((item) => (
          <div
            key={item.name}
            className="flex flex-col gap-2 rounded-2xl bg-card p-5 ring-1 ring-foreground/10"
          >
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <PlugsConnectedIcon size={20} weight="duotone" aria-hidden />
            </span>
            <h3 className="font-heading text-base font-medium text-foreground">
              {item.name}
            </h3>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
