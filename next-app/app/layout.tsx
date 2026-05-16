import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeScript } from "@/components/theme-script";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Docentix — Gestión de tareas para instituciones educativas",
    template: "%s | Docentix",
  },
  description:
    "Docentix es la plataforma donde rectores y coordinadores asignan, hacen seguimiento y cierran tareas con sus docentes, con plazos claros y trazabilidad real.",
  applicationName: "Docentix",
  keywords: [
    "docentix",
    "gestión de tareas docentes",
    "instituciones educativas",
    "rector",
    "coordinador académico",
    "docentes",
  ],
  openGraph: {
    title: "Docentix — Gestión de tareas para instituciones educativas",
    description:
      "Asigná, hacé seguimiento y cerrá tareas con tus docentes en un solo lugar.",
    type: "website",
    siteName: "Docentix",
    locale: "es",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={cn("h-full antialiased", inter.variable, "font-sans")}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
