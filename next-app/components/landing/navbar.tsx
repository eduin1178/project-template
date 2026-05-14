import Link from "next/link";
import { Logo } from "./logo";
import { AuthCta } from "./auth-cta";
import { RequestDemoButton } from "./request-demo-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { siteContent } from "@/content/landing";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          aria-label={`Inicio — ${siteContent.brand.name}`}
          className="inline-flex items-center"
        >
          <Logo />
        </Link>

        <nav
          aria-label="Secciones"
          className="hidden items-center gap-6 text-sm text-muted-foreground md:flex"
        >
          {siteContent.nav.sections.map((s) => (
            <a key={s.href} href={s.href} className="hover:text-foreground">
              {s.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <AuthCta />
          <RequestDemoButton
            size="sm"
            label={siteContent.nav.requestDemo}
            className="hidden sm:inline-flex"
          />
          <RequestDemoButton
            size="sm"
            label="Demo"
            className="sm:hidden"
          />
        </div>
      </div>
    </header>
  );
}
