export const RESERVED_SLUGS = new Set<string>([
  "super",
  "account",
  "api",
  "login",
  "signup",
  "forgot-password",
  "reset-password",
  "verify-email",
  "check-email",
  "accept-invitation",
  "post-login",
  "no-organization",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "admin",
  "app",
  "settings",
  "billing",
  "docs",
  "help",
  "status",
  "blog",
  "about",
  "legal",
  "privacy",
  "terms",
]);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 40;

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

export type SlugValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export function validateSlug(slug: string): SlugValidationResult {
  if (typeof slug !== "string") {
    return { ok: false, reason: "El identificador es obligatorio." };
  }
  const normalized = slug.trim();
  if (normalized.length < SLUG_MIN_LENGTH) {
    return {
      ok: false,
      reason: `El identificador debe tener al menos ${SLUG_MIN_LENGTH} caracteres.`,
    };
  }
  if (normalized.length > SLUG_MAX_LENGTH) {
    return {
      ok: false,
      reason: `El identificador no puede superar ${SLUG_MAX_LENGTH} caracteres.`,
    };
  }
  if (!SLUG_PATTERN.test(normalized)) {
    return {
      ok: false,
      reason:
        "Usa solo minúsculas, números y guiones simples (kebab-case). Sin espacios ni símbolos.",
    };
  }
  if (isReservedSlug(normalized)) {
    return {
      ok: false,
      reason: "Ese identificador está reservado por el sistema.",
    };
  }
  return { ok: true };
}
