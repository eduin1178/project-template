import { describe, expect, it } from "vitest";

import {
  isReservedSlug,
  RESERVED_SLUGS,
  validateSlug,
} from "../reserved-slugs";

describe("isReservedSlug", () => {
  it("detecta slugs reservados típicos", () => {
    expect(isReservedSlug("super")).toBe(true);
    expect(isReservedSlug("admin")).toBe(true);
    expect(isReservedSlug("api")).toBe(true);
    expect(isReservedSlug("login")).toBe(true);
  });

  it("es case-insensitive", () => {
    expect(isReservedSlug("Super")).toBe(true);
    expect(isReservedSlug("ADMIN")).toBe(true);
  });

  it("permite slugs no reservados", () => {
    expect(isReservedSlug("docentix")).toBe(false);
    expect(isReservedSlug("acme-school")).toBe(false);
  });

  it("expone el set para inspección", () => {
    expect(RESERVED_SLUGS.has("super")).toBe(true);
  });
});

describe("validateSlug", () => {
  it("acepta slugs válidos en kebab-case", () => {
    expect(validateSlug("docentix")).toEqual({ ok: true });
    expect(validateSlug("acme-school")).toEqual({ ok: true });
    expect(validateSlug("school-2026")).toEqual({ ok: true });
  });

  it("rechaza slugs demasiado cortos", () => {
    const result = validateSlug("ab");
    expect(result.ok).toBe(false);
  });

  it("rechaza slugs demasiado largos", () => {
    const result = validateSlug("a".repeat(41));
    expect(result.ok).toBe(false);
  });

  it("rechaza mayúsculas", () => {
    const result = validateSlug("Docentix");
    expect(result.ok).toBe(false);
  });

  it("rechaza espacios y símbolos", () => {
    expect(validateSlug("acme school").ok).toBe(false);
    expect(validateSlug("acme_school").ok).toBe(false);
    expect(validateSlug("acme.school").ok).toBe(false);
  });

  it("rechaza guiones consecutivos o al inicio/fin", () => {
    expect(validateSlug("-acme").ok).toBe(false);
    expect(validateSlug("acme-").ok).toBe(false);
    expect(validateSlug("acme--school").ok).toBe(false);
  });

  it("rechaza slugs reservados", () => {
    const result = validateSlug("super");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/reservado/i);
    }
  });
});
