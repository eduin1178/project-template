import { describe, expect, it } from "vitest";

import { deriveDashboardHref } from "../derive-dashboard-href";

describe("deriveDashboardHref — with activeOrgRole", () => {
  it("super sin org activa → /super", () => {
    expect(
      deriveDashboardHref({
        user: { role: "super_admin" },
        activeOrgRole: null,
      }),
    ).toBe("/super");
  });

  it("super con activeOrgRole member → /app", () => {
    expect(
      deriveDashboardHref({
        user: { role: "super_admin" },
        activeOrgRole: "member",
      }),
    ).toBe("/app");
  });

  it("super con activeOrgRole admin → /admin", () => {
    expect(
      deriveDashboardHref({
        user: { role: "super_admin" },
        activeOrgRole: "admin",
      }),
    ).toBe("/admin");
  });

  it("usuario con activeOrgRole admin → /admin", () => {
    expect(
      deriveDashboardHref({
        user: { role: "user" },
        activeOrgRole: "admin",
      }),
    ).toBe("/admin");
  });

  it("usuario con activeOrgRole owner → /admin", () => {
    expect(
      deriveDashboardHref({
        user: { role: "user" },
        activeOrgRole: "owner",
      }),
    ).toBe("/admin");
  });

  it("usuario con activeOrgRole member → /app aunque sea admin en otra org", () => {
    expect(
      deriveDashboardHref({
        user: { role: "user" },
        memberships: [{ role: "admin" }],
        activeOrgRole: "member",
      }),
    ).toBe("/app");
  });

  it("usuario regular sin org activa → /account/organizations", () => {
    expect(
      deriveDashboardHref({
        user: { role: "user" },
        activeOrgRole: null,
      }),
    ).toBe("/account/organizations");
  });
});

describe("deriveDashboardHref — legacy (sin activeOrgRole)", () => {
  it("super_admin → /super", () => {
    expect(
      deriveDashboardHref({
        user: { role: "super_admin" },
        memberships: [],
      }),
    ).toBe("/super");
  });

  it("usuario con membership admin → /admin", () => {
    expect(
      deriveDashboardHref({
        user: { role: "user" },
        memberships: [{ role: "admin" }],
      }),
    ).toBe("/admin");
  });

  it("usuario con membership owner → /admin", () => {
    expect(
      deriveDashboardHref({
        user: { role: "user" },
        memberships: [{ role: "owner" }],
      }),
    ).toBe("/admin");
  });

  it("usuario con membership member → /app", () => {
    expect(
      deriveDashboardHref({
        user: { role: "user" },
        memberships: [{ role: "member" }],
      }),
    ).toBe("/app");
  });

  it("usuario sin memberships → /app", () => {
    expect(
      deriveDashboardHref({
        user: { role: "user" },
        memberships: [],
      }),
    ).toBe("/app");
  });
});
