import Image from "next/image";
import { Button } from "@/components/ui/button";
import { RequestDemoButton } from "./request-demo-button";
import { siteContent } from "@/content/landing";

export function Hero() {
  const { hero } = siteContent;

  return (
    <section className="relative w-full overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-background to-background dark:from-primary/10" />
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-12 lg:items-center lg:gap-12 lg:py-28">
        <div className="flex flex-col items-start gap-6 lg:col-span-6">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium tracking-wide text-primary uppercase">
            {hero.eyebrow}
          </span>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {hero.title}
          </h1>
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            {hero.subtitle}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <RequestDemoButton size="lg" label={hero.primaryCta} />
            <Button asChild variant="outline" size="lg">
              <a href="#como-funciona">{hero.secondaryCta}</a>
            </Button>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xl ring-1 ring-foreground/5">
            <Image
              src={hero.image.light}
              alt={hero.image.alt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover dark:hidden"
            />
            <Image
              src={hero.image.dark}
              alt={hero.image.alt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="hidden object-cover dark:block"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
