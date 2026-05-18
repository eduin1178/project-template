import Image from "next/image";
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
                <ShowcaseFrame
                  light={item.image}
                  dark={item.imageDark}
                  alt={item.alt}
                />
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}

function ShowcaseFrame({
  light,
  dark,
  alt,
}: {
  light: string;
  dark: string;
  alt: string;
}) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-4 -z-10 rounded-4xl bg-linear-to-tr from-primary/15 via-primary/5 to-transparent blur-2xl dark:from-primary/25"
      />
      <div className="relative aspect-16/10 w-full overflow-hidden rounded-3xl border border-border bg-card p-2 shadow-xl ring-1 ring-foreground/5 sm:p-3">
        <Image
          src={light}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-contain object-center p-1 dark:hidden"
        />
        <Image
          src={dark}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="hidden object-contain object-center p-1 dark:block"
        />
      </div>
    </div>
  );
}
