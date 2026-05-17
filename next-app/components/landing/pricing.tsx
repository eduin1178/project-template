import {
  CheckIcon,
  DatabaseIcon,
  SparkleIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Section, SectionHeader } from "./section";
import { RequestDemoButton } from "./request-demo-button";
import { Badge } from "@/components/ui/badge";
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

      {/* Banner de precio único */}
      <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-2 rounded-3xl border border-primary/20 bg-linear-to-br from-primary/10 via-card to-primary/5 px-6 py-6 text-center">
        <div className="flex items-baseline gap-2">
          <span className="font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {pricingContent.priceLabel}
          </span>
          <span className="text-sm text-muted-foreground sm:text-base">
            {pricingContent.priceUnit}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {pricingContent.priceNote}
        </p>
      </div>

      {/* Features comunes */}
      <div className="mx-auto mt-8 max-w-3xl rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
        <h3 className="font-heading text-sm font-medium tracking-wide text-muted-foreground uppercase">
          {pricingContent.commonFeaturesTitle}
        </h3>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {pricingContent.commonFeatures.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-foreground">
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
      </div>

      {/* Tarjetas por tamaño */}
      <div className="mt-10 grid gap-6 pt-3 md:grid-cols-3">
        {pricingContent.plans.map((plan) => (
          <div key={plan.name} className="relative h-full">
            {plan.highlighted && (
              <Badge
                variant="default"
                className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 gap-1 bg-primary px-3 py-1 text-primary-foreground"
              >
                <SparkleIcon size={12} weight="fill" aria-hidden />
                Recomendado
              </Badge>
            )}
            <Card
              className={cn(
                "h-full transition-shadow hover:shadow-md",
                plan.highlighted &&
                  "border-primary/40 shadow-lg shadow-primary/10 ring-1 ring-primary/30",
              )}
            >
              <CardHeader>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-3 text-sm">
                  <li className="flex items-start gap-2">
                    <UsersThreeIcon
                      size={18}
                      weight="duotone"
                      className="mt-0.5 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span className="font-medium text-foreground">
                      {plan.users}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <DatabaseIcon
                      size={18}
                      weight="duotone"
                      className="mt-0.5 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span className="font-medium text-foreground">
                      {plan.storage}
                    </span>
                  </li>
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
          </div>
        ))}
      </div>

      {/* Bloque "más de 150 usuarios" */}
      <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-3xl border border-dashed border-border bg-card/60 p-6 text-center sm:flex-row sm:p-8 sm:text-left">
        <div className="max-w-2xl">
          <h3 className="font-heading text-lg font-medium text-foreground">
            {pricingContent.enterprise.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {pricingContent.enterprise.description}
          </p>
        </div>
        <RequestDemoButton
          size="lg"
          label={pricingContent.enterprise.cta}
          className="shrink-0"
        />
      </div>
    </Section>
  );
}
