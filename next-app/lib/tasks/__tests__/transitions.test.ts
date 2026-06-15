import { describe, expect, it } from "vitest";

import { isStatusTransitionAllowed } from "../transitions";

describe("isStatusTransitionAllowed", () => {
  it("rechaza transición directa de pending a done", () => {
    expect(isStatusTransitionAllowed("pending", "done")).toBe(false);
  });

  it("permite transiciones de status trazables por pasos", () => {
    expect(isStatusTransitionAllowed("pending", "in_progress")).toBe(true);
    expect(isStatusTransitionAllowed("in_progress", "done")).toBe(true);
    expect(isStatusTransitionAllowed("done", "in_progress")).toBe(true);
  });
});
