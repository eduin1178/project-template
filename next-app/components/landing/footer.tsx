import { Logo } from "./logo";
import { footerContent, siteContent } from "@/content/landing";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border/60 bg-background">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-4">
        <div className="flex flex-col gap-4 lg:col-span-1">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            {footerContent.description}
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3 lg:col-span-3">
          {footerContent.columns.map((col) => (
            <div key={col.title}>
              <h3 className="font-heading text-sm font-medium text-foreground">
                {col.title}
              </h3>
              <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-6">
          <p>
            © {year} {siteContent.brand.name}. Todos los derechos reservados.
          </p>
          <p>
            <a
              href={`mailto:${footerContent.contactEmail}`}
              className="hover:text-foreground"
            >
              {footerContent.contactEmail}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
