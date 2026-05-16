import { describe, expect, it } from "vitest";

import {
  PLATFORM_ORG_NAME,
  PLATFORM_ORG_SLUG,
} from "../platform-org-constants";

describe("platform-org constants", () => {
  it("PLATFORM_ORG_SLUG es 'docentix'", () => {
    expect(PLATFORM_ORG_SLUG).toBe("docentix");
  });

  it("PLATFORM_ORG_NAME es 'Docentix'", () => {
    expect(PLATFORM_ORG_NAME).toBe("Docentix");
  });

  it("slug y nombre no contienen espacios al inicio o final", () => {
    expect(PLATFORM_ORG_SLUG).toBe(PLATFORM_ORG_SLUG.trim());
    expect(PLATFORM_ORG_NAME).toBe(PLATFORM_ORG_NAME.trim());
  });

  it("el slug es URL-safe (solo lowercase, dígitos, guiones)", () => {
    expect(PLATFORM_ORG_SLUG).toMatch(/^[a-z0-9-]+$/);
  });
});
