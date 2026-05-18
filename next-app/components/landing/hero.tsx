import Image from "next/image";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { RequestDemoButton } from "./request-demo-button";
import { siteContent } from "@/content/landing";

export function Hero() {
  const { hero } = siteContent;

  return (
    <section className="relative w-full overflow-hidden">
      {/* Capa de fondo: gradiente sutil hacia el primario */}
      <div className="absolute inset-0 -z-20 bg-linear-to-b from-primary/5 via-background to-background dark:from-primary/10" />

      {/* Capa decorativa: grid de puntos suave */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.25] bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-size-[24px_24px] mask-[radial-gradient(ellipse_60%_60%_at_50%_0%,#000_40%,transparent_100%)]"
      />

      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-12 lg:items-center lg:gap-12 lg:py-28">
        <div className="flex flex-col items-start gap-6 lg:col-span-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium tracking-wide text-primary uppercase">
            <span className="size-1.5 rounded-full bg-primary" />
            {hero.eyebrow}
          </span>

          <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
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

          <ul className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {hero.badges.map((b) => (
              <li key={b} className="flex items-center gap-1.5">
                <CheckIcon
                  size={14}
                  weight="bold"
                  className="text-primary"
                  aria-hidden
                />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-6">
          <div className="relative">
            {/* Glow detrás del frame */}
            <div
              aria-hidden
              className="absolute -inset-4 -z-10 rounded-4xl bg-linear-to-tr from-primary/20 via-primary/5 to-transparent blur-2xl dark:from-primary/30"
            />
            <div className="relative aspect-16/10 w-full overflow-hidden rounded-3xl border border-border/60 bg-card p-2 shadow-2xl ring-1 ring-foreground/5 sm:p-3">
              <Image
                src={hero.image.light}
                alt={hero.image.alt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain object-center p-1 dark:hidden"
              />
              <Image
                src={hero.image.dark}
                alt={hero.image.alt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="hidden object-contain object-center p-1 dark:block"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
