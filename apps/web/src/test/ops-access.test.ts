import { describe, expect, it } from "vitest";

import { decideOpsAccess } from "../auth/ops-access";

describe("operations access decision", () => {
  it("sends anonymous requests to sign in", () => {
    expect(decideOpsAccess(null, undefined)).toBe("sign-in");
  });

  it("rejects an authenticated user without the admin role", () => {
    expect(decideOpsAccess("user_123", { metadata: { role: "member" } })).toBe(
      "forbidden",
    );
  });

  it("allows an authenticated administrator", () => {
    expect(decideOpsAccess("user_123", { metadata: { role: "admin" } })).toBe(
      "allow",
    );
  });
});
