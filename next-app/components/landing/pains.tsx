import { Section, SectionHeader } from "./section";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
          <Card key={item.title} className="h-full">
            <CardHeader>
              <CardTitle className="text-base">{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </Section>
  );
}
