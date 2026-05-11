import { CheckIcon } from "@phosphor-icons/react/dist/ssr";
import { Section, SectionHeader } from "./section";
import { RequestDemoButton } from "./request-demo-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { pricingContent } from "@/content/landing";
import { cn } from "@/lib/utils";

export function Pricing() {
  return (
    <Section id="planes">
      <SectionHeader
        eyebrow={pricingContent.eyebrow}
        title={pricingContent.title}
        subtitle={pricingContent.subtitle}
      />
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {pricingContent.plans.map((plan) => (
          <Card
            key={plan.name}
            className={cn(
              "h-full",
              plan.highlighted &&
                "ring-2 ring-primary shadow-lg shadow-primary/10"
            )}
          >
            <CardHeader>
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-2 font-heading text-2xl font-semibold text-foreground">
                {plan.price}
              </div>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckIcon
                      size={16}
                      weight="bold"
                      className="mt-0.5 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <RequestDemoButton
                size="default"
                variant={plan.highlighted ? "default" : "outline"}
                label={plan.cta}
                className="w-full"
              />
            </CardFooter>
          </Card>
        ))}
      </div>
    </Section>
  );
}
