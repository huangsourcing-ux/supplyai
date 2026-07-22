import { describe, expect, it } from "vitest";

import { hasAdminRole } from "../auth/admin-role";

describe("hasAdminRole", () => {
  it("accepts only the exact admin role in metadata", () => {
    expect(hasAdminRole({ metadata: { role: "admin" } })).toBe(true);
  });

  it.each([
    undefined,
    null,
    {},
    { metadata: null },
    { metadata: [] },
    { metadata: {} },
    { metadata: { role: "Admin" } },
    { metadata: { role: "moderator" } },
    { publicMetadata: { role: "admin" } },
  ])("rejects a non-admin claim: %j", (claim) => {
    expect(hasAdminRole(claim)).toBe(false);
  });
});
