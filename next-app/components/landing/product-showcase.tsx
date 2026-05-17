import { ImageSquareIcon } from "@phosphor-icons/react/dist/ssr";
import { Section, SectionHeader } from "./section";
import { productShowcaseContent } from "@/content/landing";
import { cn } from "@/lib/utils";

export function ProductShowcase() {
  return (
    <Section id="producto">
      <SectionHeader
        eyebrow={productShowcaseContent.eyebrow}
        title={productShowcaseContent.title}
        subtitle={productShowcaseContent.subtitle}
      />

      <div className="mt-16 flex flex-col gap-20">
        {productShowcaseContent.items.map((item, idx) => {
          const reversed = idx % 2 === 1;
          return (
            <article
              key={item.title}
              className={cn(
                "grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-12",
              )}
            >
              <div
                className={cn(
                  "lg:col-span-5",
                  reversed && "lg:order-2",
                )}
              >
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium tracking-wide text-primary uppercase">
                  <span className="size-1.5 rounded-full bg-primary" />
                  Vista {String(idx + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-4 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {item.title}
                </h3>
                <p className="mt-3 text-base text-muted-foreground sm:text-lg">
                  {item.description}
                </p>
              </div>

              <div
                className={cn(
                  "lg:col-span-7",
                  reversed && "lg:order-1",
                )}
              >
                <ShowcaseFrame alt={item.alt} />
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}

function ShowcaseFrame({ alt }: { alt: string }) {
  return (
    <div className="relative aspect-16/10 w-full overflow-hidden rounded-3xl border border-border bg-card shadow-xl ring-1 ring-foreground/5">
      <div
        role="img"
        aria-label={alt}
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-linear-to-br from-primary/5 via-muted/40 to-background"
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-size-[32px_32px] opacity-30" />
        <div className="relative flex flex-col items-center gap-2 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <ImageSquareIcon size={26} weight="duotone" aria-hidden />
          </span>
          <p className="max-w-xs px-4 text-sm font-medium text-foreground">
            Captura del producto
          </p>
          <p className="max-w-xs px-4 text-xs text-muted-foreground">
            {alt}
          </p>
        </div>
      </div>
    </div>
  );
}
