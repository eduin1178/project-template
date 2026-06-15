import { describe, expect, it } from "vitest";

import { countActiveFilters, parseTaskListViewMode } from "../route-params";

describe("parseTaskListViewMode", () => {
  it("usa board cuando no hay view", () => {
    expect(parseTaskListViewMode(undefined)).toBe("board");
  });

  it("acepta cards como modo alternativo", () => {
    expect(parseTaskListViewMode("cards")).toBe("cards");
  });

  it("usa board para valores invalidos", () => {
    expect(parseTaskListViewMode("calendar")).toBe("board");
  });
});

describe("countActiveFilters", () => {
  it("cuenta solo visibility como filtro visible", () => {
    expect(
      countActiveFilters({
        visibility: "draft,active",
        status: "pending",
      }),
    ).toBe(2);
  });

  it("ignora status cuando no hay visibility", () => {
    expect(countActiveFilters({ status: "pending,in_progress" })).toBe(0);
  });
});
