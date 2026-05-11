"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuthStatus } from "@/lib/auth/use-auth-status";
import { siteContent } from "@/content/landing";

export function AuthCta() {
  const auth = useAuthStatus();
  const labels = siteContent.nav;

  if (auth.status === "loading") {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        aria-label={labels.loading}
        className="min-w-[6rem]"
      >
        <span className="sr-only">{labels.loading}</span>
        <span
          className="h-3 w-16 animate-pulse rounded-full bg-muted"
          aria-hidden
        />
      </Button>
    );
  }

  if (auth.status === "authenticated") {
    return (
      <Button asChild variant="ghost" size="sm">
        <Link href={auth.dashboardHref}>{labels.dashboard}</Link>
      </Button>
    );
  }

  return (
    <Button asChild variant="ghost" size="sm">
      <Link href="/login">{labels.login}</Link>
    </Button>
  );
}
