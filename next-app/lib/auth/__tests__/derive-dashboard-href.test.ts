import { describe, expect, it } from "vitest";

import { deriveDashboardHref } from "../derive-dashboard-href";

describe("deriveDashboardHref — con activeOrgSlug", () => {
  it("super sin org activa → /super", () => {
    expect(
      deriveDashboardHref({
        user: { role: "super_admin" },
        activeOrgRole: null,
      }),
    ).toBe("/super");
  });

  it("usuario con activeOrgRole admin y slug → /<slug>/admin", () => {
    expect(
      deriveDashboardHref({
        user: { role: "user" },
        activeOrgRole: "admin",
        activeOrgSlug: "acme",
      }),
    ).toBe("/acme/admin");
  });

  it("usuario con activeOrgRole owner y slug → /<slug>/admin", () => {
    expect(
      deriveDashboardHref({
        user: { role: "user" },
        activeOrgRole: "owner",
        activeOrgSlug: "acme",
      }),
    ).toBe("/acme/admin");
  });

  it("usuario con activeOrgRole member y slug → /<slug>", () => {
    expect(
      deriveDashboardHref({
        user: { role: "user" },
        activeOrgRole: "member",
        activeOrgSlug: "acme",
      }),
    ).toBe("/acme");
  });

  it("super con activeOrgRole member y slug → /<slug>", () => {
    expect(
      deriveDashboardHref({
        user: { role: "super_admin" },
        activeOrgRole: "member",
        activeOrgSlug: "docentix",
      }),
    ).toBe("/docentix");
  });

  it("usuario sin org activa → /account/organizations", () => {
    expect(
      deriveDashboardHref({
        user: { role: "user" },
        activeOrgRole: null,
      }),
    ).toBe("/account/organizations");
  });

  it("sin slug, delega a /post-login", () => {
    expect(
      deriveDashboardHref({
        user: { role: "user" },
        activeOrgRole: "admin",
      }),
    ).toBe("/post-login");
  });
});

describe("deriveDashboardHref — fallback sin activeOrgRole", () => {
  it("super_admin → /super", () => {
    expect(
      deriveDashboardHref({
        user: { role: "super_admin" },
        memberships: [],
      }),
    ).toBe("/super");
  });

  it("usuario normal sin contexto → /post-login (delega al server)", () => {
    expect(
      deriveDashboardHref({
        user: { role: "user" },
        memberships: [{ role: "admin" }],
      }),
    ).toBe("/post-login");
  });
});
